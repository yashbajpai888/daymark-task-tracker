import { db, canAccessFirestore, removeUndefinedFields } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { TaskItem, TaskStatus } from "@/types";

const LOCAL_STORAGE_KEY = "daymark_local_tasks";

function getLocalTasks(): TaskItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalTasks(tasks: TaskItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
}

export async function getTasksForDate(uid: string, date: string): Promise<TaskItem[]> {
  if (!canAccessFirestore(uid) || !db) {
    const all = getLocalTasks();
    return all.filter((t) => t.date === date);
  }

  try {
    const colRef = collection(db, "users", uid, "tasks");
    const q = query(colRef, where("date", "==", date));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as TaskItem[];
  } catch (err) {
    console.error("Error fetching tasks for date:", err);
    return getLocalTasks().filter((t) => t.date === date);
  }
}

export async function getTasksForRange(
  uid: string,
  startDate: string,
  endDate: string
): Promise<TaskItem[]> {
  if (!canAccessFirestore(uid) || !db) {
    const all = getLocalTasks();
    return all.filter((t) => t.date >= startDate && t.date <= endDate);
  }

  try {
    const colRef = collection(db, "users", uid, "tasks");
    const q = query(
      colRef,
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as TaskItem[];
  } catch (err) {
    console.error("Error fetching tasks for range:", err);
    return getLocalTasks().filter((t) => t.date >= startDate && t.date <= endDate);
  }
}

export async function createTask(
  uid: string,
  taskData: Omit<TaskItem, "id" | "createdAt" | "updatedAt">,
  customId?: string
): Promise<TaskItem> {
  const newId = customId || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const fullTask: TaskItem = {
    ...taskData,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalTasks();
    // Check for idempotency duplicate
    const existingIdx = list.findIndex((t) => t.id === newId || (taskData.idempotencyKey && t.idempotencyKey === taskData.idempotencyKey));
    if (existingIdx !== -1) {
      return list[existingIdx];
    }
    list.push(fullTask);
    saveLocalTasks(list);
    return fullTask;
  }

  const docRef = doc(db, "users", uid, "tasks", newId);
  const cleanPayload = removeUndefinedFields(taskData);
  await setDoc(docRef, {
    ...cleanPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return fullTask;
}

export async function updateTask(
  uid: string,
  taskId: string,
  updates: Partial<TaskItem>
): Promise<void> {
  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalTasks();
    const idx = list.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates, updatedAt: Date.now() };
      saveLocalTasks(list);
    }
    return;
  }

  const docRef = doc(db, "users", uid, "tasks", taskId);
  const cleanUpdates = removeUndefinedFields(updates);
  await updateDoc(docRef, {
    ...cleanUpdates,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleTaskStatus(
  uid: string,
  taskId: string,
  currentStatus: TaskStatus
): Promise<TaskStatus> {
  const newStatus: TaskStatus = currentStatus === "completed" ? "todo" : "completed";
  const now = Date.now();

  const updates: Partial<TaskItem> = {
    status: newStatus,
    completedAt: newStatus === "completed" ? now : null,
  };

  await updateTask(uid, taskId, updates);
  return newStatus;
}

export async function cancelTask(uid: string, taskId: string): Promise<void> {
  await updateTask(uid, taskId, {
    status: "cancelled",
    cancelledAt: Date.now(),
  });
}

export async function deleteTask(uid: string, taskId: string): Promise<void> {
  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalTasks().filter((t) => t.id !== taskId);
    saveLocalTasks(list);
    return;
  }

  const docRef = doc(db, "users", uid, "tasks", taskId);
  await deleteDoc(docRef);
}

export async function updateTaskTargetProgress(
  uid: string,
  taskId: string,
  progress: number
): Promise<void> {
  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalTasks();
    const idx = list.findIndex((t) => t.id === taskId);
    if (idx !== -1 && list[idx].target) {
      const target = list[idx].target!;
      const isCompleted = progress >= target.value;
      list[idx] = {
        ...list[idx],
        target: { ...target, progress },
        status: isCompleted ? "completed" : "todo",
        completedAt: isCompleted ? Date.now() : null,
        updatedAt: Date.now(),
      };
      saveLocalTasks(list);
    }
    return;
  }

  const docRef = doc(db, "users", uid, "tasks", taskId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as TaskItem;
    if (data.target) {
      const isCompleted = progress >= data.target.value;
      await updateDoc(docRef, {
        "target.progress": progress,
        status: isCompleted ? "completed" : "todo",
        completedAt: isCompleted ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
    }
  }
}
