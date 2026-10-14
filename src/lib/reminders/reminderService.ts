import { db, canAccessFirestore } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ReminderSettings } from "@/types";
import { DEFAULT_TIMEZONE } from "@/lib/dates";

const LOCAL_STORAGE_REMINDERS_KEY = "daymark_local_reminder_settings";

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  pushEnabled: false,
  destinationEmail: "",
  emailVerified: false,
  timeZone: DEFAULT_TIMEZONE,
  intervalMinutes: 60,
  scheduledTimes: ["09:00", "14:00", "19:00"],
  quietHours: {
    enabled: true,
    start: "22:00",
    end: "07:00",
  },
  dailySummaryEnabled: true,
  dailySummaryTime: "21:00",
  maxEmailsPerDay: 3,
  soundEnabled: true,
};

function getLocalSettings(): ReminderSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const raw = localStorage.getItem(LOCAL_STORAGE_REMINDERS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveLocalSettings(settings: ReminderSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_REMINDERS_KEY, JSON.stringify(settings));
}

export async function getReminderSettings(uid: string): Promise<ReminderSettings> {
  if (!canAccessFirestore(uid) || !db) {
    return getLocalSettings();
  }

  try {
    const docRef = doc(db, "users", uid, "reminderSettings", "main");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_SETTINGS, ...(snap.data() as ReminderSettings) };
    }
    return getLocalSettings();
  } catch (err) {
    console.error("Error fetching reminder settings:", err);
    return getLocalSettings();
  }
}

export async function saveReminderSettings(
  uid: string,
  settings: ReminderSettings
): Promise<void> {
  saveLocalSettings(settings);

  if (!canAccessFirestore(uid) || !db) {
    return;
  }

  try {
    const docRef = doc(db, "users", uid, "reminderSettings", "main");
    await setDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp(),
      createdAt: settings.createdAt || serverTimestamp(),
    });
  } catch (err) {
    console.error("Error saving reminder settings to Firestore:", err);
  }
}

export async function sendTestEmailApi(
  destinationEmail: string,
  idToken?: string | null
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (idToken) {
      headers["Authorization"] = `Bearer ${idToken}`;
    }

    const res = await fetch("/api/reminders/test", {
      method: "POST",
      headers,
      body: JSON.stringify({ destinationEmail }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `Error ${res.status}: ${res.statusText}` };
    }

    return data;
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error while sending test email",
    };
  }
}
