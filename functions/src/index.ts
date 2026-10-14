// Daymark Firebase Cloud Functions Scheduled Reminder Worker
// Deploy with: firebase deploy --only functions
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const messaging = getMessaging();

/**
 * Scheduled Cloud Function that runs every 15 minutes.
 * Checks scheduled custom reminders (Gym, Running, Water) and pending tasks,
 * and delivers FCM web push notifications to users even when website is closed.
 */
export const dispatchScheduledReminders = onSchedule("every 15 minutes", async () => {
  const usersSnap = await db.collection("users").get();
  const now = new Date();

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;

    // Check user reminder settings
    const settingsSnap = await db
      .collection("users")
      .doc(uid)
      .collection("reminderSettings")
      .doc("main")
      .get();

    const settings = settingsSnap.data() || {
      pushEnabled: true,
      timeZone: "Asia/Kolkata",
      quietHours: { enabled: true, start: "22:00", end: "07:00" },
    };

    if (settings.pushEnabled === false) continue;

    const timeZone = settings.timeZone || "Asia/Kolkata";

    // Format local date and time
    const localDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const localTimeStr = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);

    const [currentHour] = localTimeStr.split(":").map(Number);

    // Respect Quiet Hours
    if (settings.quietHours?.enabled) {
      const { start, end } = settings.quietHours;
      const inQuietHours =
        start > end
          ? localTimeStr >= start || localTimeStr < end
          : localTimeStr >= start && localTimeStr < end;
      if (inQuietHours) continue;
    }

    // Get FCM Tokens
    const tokensSnap = await db.collection("users").doc(uid).collection("fcmTokens").get();
    if (tokensSnap.empty) continue;

    const tokenDocs = tokensSnap.docs;
    const tokens = tokenDocs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data().token as string).filter(Boolean);
    if (tokens.length === 0) continue;

    // Process Custom Reminders
    const remindersSnap = await db
      .collection("users")
      .doc(uid)
      .collection("customReminders")
      .where("enabled", "==", true)
      .get();

    for (const remDoc of remindersSnap.docs) {
      const reminder = remDoc.data();
      const [remHour] = (reminder.reminderTime || "09:00").split(":").map(Number);

      let shouldTrigger = false;
      if (reminder.repeatType === "daily" && remHour === currentHour) {
        shouldTrigger = true;
      } else if (reminder.repeatType === "interval" && currentHour >= 8 && currentHour <= 22) {
        const intervalHours = Math.max(1, Math.round((reminder.intervalMinutes || 120) / 60));
        if (currentHour % intervalHours === 0) shouldTrigger = true;
      }

      if (!shouldTrigger) continue;

      // Check linked task status if applicable
      if (reminder.linkedTaskId) {
        const taskSnap = await db.collection("users").doc(uid).collection("tasks").doc(reminder.linkedTaskId).get();
        if (!taskSnap.exists || taskSnap.data()?.status !== "todo") continue;
      }

      // Idempotency check
      const eventId = `cf_rem_${uid}_${remDoc.id}_${localDateStr}_${currentHour}h`;
      const eventRef = db.collection("users").doc(uid).collection("reminderEvents").doc(eventId);
      const existing = await eventRef.get();
      if (existing.exists && existing.data()?.status === "sent") continue;

      // Dispatch WebPush
      try {
        const response = await messaging.sendEachForMulticast({
          tokens,
          notification: {
            title: reminder.title || "Daymark Reminder",
            body: reminder.description || `Scheduled for ${reminder.reminderTime}`,
          },
          data: {
            url: "/daily",
            tag: `cf-${remDoc.id}-${localDateStr}`,
          },
          webpush: {
            notification: {
              title: reminder.title || "Daymark Reminder",
              body: reminder.description || `Scheduled for ${reminder.reminderTime}`,
              icon: "/icons/icon-192.png",
              badge: "/icons/badge-72.png",
            },
            fcmOptions: {
              link: "/daily",
            },
          },
        });

        await eventRef.set({
          idempotencyKey: eventId,
          scheduledForLocalDate: localDateStr,
          status: response.successCount > 0 ? "sent" : "failed",
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error("Error sending push in cloud function:", err);
      }
    }
  }
});
