import { NextRequest, NextResponse } from "next/server";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
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
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminConfigured || !adminDb) {
      return NextResponse.json(
        { message: "Firebase Admin is not configured. Cron skipped." },
        { status: 200 }
      );
    }

    const usersSnap = await adminDb.collection("users").get();
    let processedUsers = 0;
    let pushNotificationsSent = 0;

    for (const userDoc of usersSnap.docs) {
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

        let shouldTrigger = false;
        let slotIdentifier = `${currentHour}:00`;

        if (reminder.repeatType === "daily") {
          const [remHour] = reminder.reminderTime.split(":").map(Number);
          if (remHour === currentHour) {
            shouldTrigger = true;
          }
        } else if (reminder.repeatType === "selected-weekdays") {
          const [remHour] = reminder.reminderTime.split(":").map(Number);
          if (
            remHour === currentHour &&
            reminder.weekdays &&
            reminder.weekdays.includes(currentWeekday)
          ) {
            shouldTrigger = true;
          }
        } else if (reminder.repeatType === "interval") {
          // Interval reminder (e.g. water every 2 hours between 08:00 and 22:00)
          if (currentHour >= 8 && currentHour <= 22) {
            const intervalHours = Math.max(1, Math.round((reminder.intervalMinutes || 120) / 60));
            if (currentHour % intervalHours === 0) {
              shouldTrigger = true;
              slotIdentifier = `interval_${currentHour}h`;
            }
          }
        } else if (reminder.repeatType === "once") {
          const [remHour] = reminder.reminderTime.split(":").map(Number);
          if (remHour === currentHour) {
            shouldTrigger = true;
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

          if (!taskDoc.exists) continue; // Task deleted
          const taskData = taskDoc.data() as TaskItem;
          if (taskData.status !== "todo") continue; // Task completed or cancelled
        }

        // Check Idempotency for this reminder slot
        const eventId = `rem_push_${uid}_${reminder.id}_${localDate}_${slotIdentifier}`;
        const eventRef = adminDb
          .collection("users")
          .doc(uid)
          .collection("reminderEvents")
          .doc(eventId);

        const existingEvent = await eventRef.get();
        if (existingEvent.exists && existingEvent.data()?.status === "sent") {
          continue; // Already sent for this slot
        }

        // Send Push Notification
        const pushResult = await sendPushNotificationToUser(uid, {
          title: reminder.title,
          body: reminder.description || `It's ${reminder.reminderTime} — time for your scheduled reminder!`,
          category: reminder.category,
          url: "/daily",
          tag: `custom-${reminder.id}-${localDate}`,
        });

        // Record event to prevent duplicates
        await eventRef.set({
          idempotencyKey: eventId,
          scheduledForLocalDate: localDate,
          scheduledSlot: slotIdentifier,
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

        const [taskHour] = task.dueTime.split(":").map(Number);
        if (taskHour === currentHour) {
          const taskEventId = `rem_push_task_${uid}_${task.id}_${localDate}_${taskHour}h`;
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
            body: task.description ? `${task.description} (Due at ${task.dueTime})` : `Scheduled for ${task.dueTime}`,
            category: "task",
            url: "/daily",
            tag: `task-${task.id}-${localDate}`,
          });

          await taskEventRef.set({
            idempotencyKey: taskEventId,
            scheduledForLocalDate: localDate,
            scheduledSlot: `${taskHour}:00`,
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
