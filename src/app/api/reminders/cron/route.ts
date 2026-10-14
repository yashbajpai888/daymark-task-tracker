import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { sendPushNotificationToUser } from "@/lib/firebase/adminMessaging";
import { getLocalDateString, getWeekdayIndex } from "@/lib/dates";
import { ReminderSettings, TaskItem, CustomReminder } from "@/types";

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") === "1";
    const cronSecret = process.env.CRON_SECRET;

    let targetUid: string | null = null;

    // Check authorization:
    // 1. Vercel Cron header
    // 2. Secret Bearer token
    // 3. Authenticated user ID token (allows client app to trigger check on schedule)
    if (!isVercelCron) {
      if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
        // Authorized via CRON_SECRET
      } else if (authHeader && authHeader.startsWith("Bearer ") && adminAuth) {
        try {
          const idToken = authHeader.split("Bearer ")[1];
          const decoded = await adminAuth.verifyIdToken(idToken);
          targetUid = decoded.uid;
        } catch {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      } else if (cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!isAdminConfigured || !adminDb) {
      return NextResponse.json(
        { message: "Firebase Admin is not configured. Cron skipped." },
        { status: 200 }
      );
    }

    let userDocs: FirebaseFirestore.DocumentSnapshot[] = [];
    if (targetUid) {
      const singleDoc = await adminDb.collection("users").doc(targetUid).get();
      if (singleDoc.exists) {
        userDocs = [singleDoc];
      }
    } else {
      const usersSnap = await adminDb.collection("users").get();
      userDocs = usersSnap.docs;
    }

    let processedUsers = 0;
    let pushNotificationsSent = 0;

    for (const userDoc of userDocs) {
      const uid = userDoc.id;

      // 1. Fetch user's reminder settings
      const settingsSnap = await adminDb
        .collection("users")
        .doc(uid)
        .collection("reminderSettings")
        .doc("main")
        .get();

      const settings = (settingsSnap.data() as ReminderSettings) || {
        enabled: false,
        pushEnabled: true,
        timeZone: "Asia/Kolkata",
        quietHours: { enabled: true, start: "22:00", end: "07:00" },
      };

      if (settings.pushEnabled === false) {
        continue;
      }

      const timeZone = settings.timeZone || "Asia/Kolkata";
      const localDate = getLocalDateString(timeZone);

      // Current local time (HH:mm)
      const now = new Date();
      const localTimeStr = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now);

      const [currentHour, currentMin] = localTimeStr.split(":").map(Number);
      const currentTotalMins = currentHour * 60 + currentMin;
      const currentWeekday = getWeekdayIndex(localDate);

      // Check Quiet Hours
      if (settings.quietHours?.enabled) {
        const { start, end } = settings.quietHours;
        const inQuietHours =
          start > end
            ? localTimeStr >= start || localTimeStr < end
            : localTimeStr >= start && localTimeStr < end;

        if (inQuietHours) {
          continue;
        }
      }

      // Check if user has registered FCM tokens
      const tokensSnap = await adminDb
        .collection("users")
        .doc(uid)
        .collection("fcmTokens")
        .limit(1)
        .get();

      if (tokensSnap.empty) {
        continue;
      }

      // ========================================================================
      // 2. Process Custom Reminders (Gym, Running, Water, Custom schedules)
      // ========================================================================
      const customRemindersSnap = await adminDb
        .collection("users")
        .doc(uid)
        .collection("customReminders")
        .where("enabled", "==", true)
        .get();

      for (const remDoc of customRemindersSnap.docs) {
        const reminder = { id: remDoc.id, ...remDoc.data() } as CustomReminder;
        const [remHour, remMin = 0] = (reminder.reminderTime || "08:00").split(":").map(Number);
        const remTotalMins = remHour * 60 + remMin;
        const diffMins = currentTotalMins - remTotalMins;

        let shouldTrigger = false;
        const formattedSlot = `${remHour.toString().padStart(2, "0")}:${remMin.toString().padStart(2, "0")}`;

        if (reminder.repeatType === "daily" || reminder.repeatType === "once") {
          // Trigger if current time has reached the reminder time and is within last 30 minutes
          if (diffMins >= 0 && diffMins <= 30) {
            shouldTrigger = true;
          }
        } else if (reminder.repeatType === "selected-weekdays") {
          if (reminder.weekdays?.includes(currentWeekday)) {
            if (diffMins >= 0 && diffMins <= 30) {
              shouldTrigger = true;
            }
          }
        } else if (reminder.repeatType === "interval") {
          // Interval reminder (e.g. water every 2 hours between 08:00 and 22:00)
          if (currentHour >= 8 && currentHour <= 22) {
            const intervalHours = Math.max(1, Math.round((reminder.intervalMinutes || 120) / 60));
            if (currentHour % intervalHours === 0 && currentMin <= 20) {
              shouldTrigger = true;
            }
          }
        }

        if (!shouldTrigger) continue;

        // If linked to a specific task, verify task is not completed, cancelled, or deleted
        if (reminder.linkedTaskId) {
          const taskDoc = await adminDb
            .collection("users")
            .doc(uid)
            .collection("tasks")
            .doc(reminder.linkedTaskId)
            .get();

          if (!taskDoc.exists) continue;
          const taskData = taskDoc.data() as TaskItem;
          if (taskData.status !== "todo") continue;
        }

        // Idempotency check: strictly one push per scheduled time per day
        const eventId = `rem_push_${uid}_${reminder.id}_${localDate}_${formattedSlot.replace(":", "h")}`;
        const eventRef = adminDb
          .collection("users")
          .doc(uid)
          .collection("reminderEvents")
          .doc(eventId);

        const existingEvent = await eventRef.get();
        if (existingEvent.exists && existingEvent.data()?.status === "sent") {
          continue; // Already successfully delivered for this day and time
        }

        // Dispatch FCM Push Notification
        const pushResult = await sendPushNotificationToUser(uid, {
          title: reminder.title,
          body:
            reminder.description ||
            `It's ${reminder.reminderTime} — time for your scheduled reminder!`,
          category: reminder.category,
          url: "/daily",
          tag: `custom-${reminder.id}-${localDate}`,
        });

        // Record event
        await eventRef.set({
          idempotencyKey: eventId,
          scheduledForLocalDate: localDate,
          scheduledSlot: formattedSlot,
          type: "custom-reminder",
          reminderId: reminder.id,
          status: pushResult.success ? "sent" : "failed",
          attemptCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          sentAt: pushResult.success ? new Date() : null,
          lastErrorCode: pushResult.error || null,
        });

        if (pushResult.success) {
          pushNotificationsSent++;
        }
      }

      // ========================================================================
      // 3. Process Pending Task Reminders for Today (Respecting Completed Tasks)
      // ========================================================================
      const tasksSnap = await adminDb
        .collection("users")
        .doc(uid)
        .collection("tasks")
        .where("date", "==", localDate)
        .where("status", "==", "todo")
        .get();

      for (const tDoc of tasksSnap.docs) {
        const task = tDoc.data() as TaskItem;
        if (!task.dueTime) continue;

        const [taskHour, taskMin = 0] = task.dueTime.split(":").map(Number);
        const taskTotalMins = taskHour * 60 + taskMin;
        const diffMins = currentTotalMins - taskTotalMins;

        // Due if current time is at or within 30 minutes of due time
        if (diffMins >= 0 && diffMins <= 30) {
          const taskFormattedSlot = `${taskHour.toString().padStart(2, "0")}:${taskMin.toString().padStart(2, "0")}`;
          const taskEventId = `rem_push_task_${uid}_${task.id}_${localDate}_${taskFormattedSlot.replace(":", "h")}`;
          const taskEventRef = adminDb
            .collection("users")
            .doc(uid)
            .collection("reminderEvents")
            .doc(taskEventId);

          const existingEvent = await taskEventRef.get();
          if (existingEvent.exists && existingEvent.data()?.status === "sent") {
            continue;
          }

          const pushResult = await sendPushNotificationToUser(uid, {
            title: `Task Reminder: ${task.title}`,
            body: task.description
              ? `${task.description} (Due at ${task.dueTime})`
              : `Scheduled for ${task.dueTime}`,
            category: "task",
            url: "/daily",
            tag: `task-${task.id}-${localDate}`,
          });

          await taskEventRef.set({
            idempotencyKey: taskEventId,
            scheduledForLocalDate: localDate,
            scheduledSlot: taskFormattedSlot,
            type: "task-due-reminder",
            taskId: task.id,
            status: pushResult.success ? "sent" : "failed",
            attemptCount: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            sentAt: pushResult.success ? new Date() : null,
          });

          if (pushResult.success) {
            pushNotificationsSent++;
          }
        }
      }

      processedUsers++;
    }

    return NextResponse.json({
      success: true,
      processedUsers,
      pushNotificationsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server cron error";
    console.error("Reminder cron execution error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
