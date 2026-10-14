import { db, canAccessFirestore, removeUndefinedFields } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { CustomReminder, NotificationHistoryItem } from "@/types";
import { DEFAULT_TIMEZONE } from "@/lib/dates";

const LOCAL_STORAGE_REMINDERS_KEY = "daymark_local_custom_reminders";
const LOCAL_STORAGE_HISTORY_KEY = "daymark_local_notif_history";

export const PRESET_REMINDERS: Array<Omit<CustomReminder, "id" | "createdAt" | "updatedAt">> = [
  {
    title: "Gym Workout",
    description: "Time to hit your daily training goals and stay strong.",
    category: "gym",
    reminderTime: "07:00",
    repeatType: "daily",
    enabled: true,
    timeZone: DEFAULT_TIMEZONE,
  },
  {
    title: "Morning Run",
    description: "Lace up your running shoes and get those morning miles in.",
    category: "running",
    reminderTime: "06:30",
    repeatType: "daily",
    enabled: true,
    timeZone: DEFAULT_TIMEZONE,
  },
  {
    title: "Hydration Check",
    description: "Drink a glass of water to keep your focus and hydration optimal.",
    category: "water",
    reminderTime: "09:00",
    repeatType: "interval",
    intervalMinutes: 120,
    enabled: true,
    timeZone: DEFAULT_TIMEZONE,
  },
];

function getLocalReminders(): CustomReminder[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_REMINDERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalReminders(reminders: CustomReminder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_REMINDERS_KEY, JSON.stringify(reminders));
}

export async function getCustomReminders(uid: string): Promise<CustomReminder[]> {
  if (!canAccessFirestore(uid) || !db) {
    return getLocalReminders();
  }

  try {
    const colRef = collection(db, "users", uid, "customReminders");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CustomReminder);
  } catch (err) {
    console.error("Error fetching custom reminders:", err);
    return getLocalReminders();
  }
}

export async function createCustomReminder(
  uid: string,
  data: Omit<CustomReminder, "id" | "createdAt" | "updatedAt">
): Promise<CustomReminder> {
  const newId = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const reminder: CustomReminder = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalReminders();
    list.push(reminder);
    saveLocalReminders(list);
    return reminder;
  }

  const docRef = doc(db, "users", uid, "customReminders", newId);
  const cleanData = removeUndefinedFields(data);
  await setDoc(docRef, {
    ...cleanData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return reminder;
}

export async function updateCustomReminder(
  uid: string,
  reminderId: string,
  updates: Partial<CustomReminder>
): Promise<void> {
  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalReminders();
    const idx = list.findIndex((r) => r.id === reminderId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates, updatedAt: Date.now() };
      saveLocalReminders(list);
    }
    return;
  }

  const docRef = doc(db, "users", uid, "customReminders", reminderId);
  const cleanUpdates = removeUndefinedFields(updates);
  await updateDoc(docRef, {
    ...cleanUpdates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCustomReminder(uid: string, reminderId: string): Promise<void> {
  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalReminders().filter((r) => r.id !== reminderId);
    saveLocalReminders(list);
    return;
  }

  const docRef = doc(db, "users", uid, "customReminders", reminderId);
  await deleteDoc(docRef);
}

// ==============================================================================
// Notification History
// ==============================================================================

function getLocalHistory(): NotificationHistoryItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalHistory(items: NotificationHistoryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(items));
}

export async function getNotificationHistory(
  uid: string,
  maxItems: number = 30
): Promise<NotificationHistoryItem[]> {
  if (!canAccessFirestore(uid) || !db) {
    return getLocalHistory();
  }

  try {
    const colRef = collection(db, "users", uid, "notificationHistory");
    const q = query(colRef, orderBy("sentAt", "desc"), limit(maxItems));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificationHistoryItem);
  } catch (err) {
    console.error("Error fetching notification history:", err);
    return getLocalHistory();
  }
}

export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalHistory();
    const idx = list.findIndex((n) => n.id === notificationId);
    if (idx !== -1) {
      list[idx].read = true;
      saveLocalHistory(list);
    }
    return;
  }

  try {
    const docRef = doc(db, "users", uid, "notificationHistory", notificationId);
    await updateDoc(docRef, { read: true });
  } catch (err) {
    console.warn("Error marking notification read:", err);
  }
}

export async function clearNotificationHistory(uid: string): Promise<void> {
  if (!canAccessFirestore(uid) || !db) {
    saveLocalHistory([]);
    return;
  }

  try {
    const colRef = collection(db, "users", uid, "notificationHistory");
    const snap = await getDocs(colRef);
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn("Error clearing notification history:", err);
  }
}
