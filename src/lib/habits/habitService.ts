import { db, canAccessFirestore, removeUndefinedFields } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { TaskTemplate, TaskItem } from "@/types";
import { getWeekdayIndex } from "@/lib/dates";
import { createTask, getTasksForDate } from "@/lib/tasks/taskService";

const LOCAL_STORAGE_KEY = "daymark_local_templates";

function getLocalTemplates(): TaskTemplate[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalTemplates(templates: TaskTemplate[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
}

export async function getTemplates(uid: string): Promise<TaskTemplate[]> {
  if (!canAccessFirestore(uid) || !db) {
    return getLocalTemplates().filter((t) => !t.archivedAt);
  }

  try {
    const colRef = collection(db, "users", uid, "taskTemplates");
    const snapshot = await getDocs(colRef);

    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as TaskTemplate)
      .filter((t) => !t.archivedAt);
  } catch (err) {
    console.error("Error fetching templates:", err);
    return getLocalTemplates().filter((t) => !t.archivedAt);
  }
}

export async function createTemplate(
  uid: string,
  templateData: Omit<TaskTemplate, "id" | "createdAt" | "updatedAt">
): Promise<TaskTemplate> {
  const newId = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const fullTemplate: TaskTemplate = {
    ...templateData,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalTemplates();
    list.push(fullTemplate);
    saveLocalTemplates(list);
    return fullTemplate;
  }

  const docRef = doc(db, "users", uid, "taskTemplates", newId);
  const cleanTemplate = removeUndefinedFields(templateData);
  await setDoc(docRef, {
    ...cleanTemplate,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return fullTemplate;
}

export async function updateTemplate(
  uid: string,
  templateId: string,
  updates: Partial<TaskTemplate>
): Promise<void> {
  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalTemplates();
    const idx = list.findIndex((t) => t.id === templateId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates, updatedAt: Date.now() };
      saveLocalTemplates(list);
    }
    return;
  }

  const docRef = doc(db, "users", uid, "taskTemplates", templateId);
  const cleanUpdates = removeUndefinedFields(updates);
  await updateDoc(docRef, {
    ...cleanUpdates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTemplate(uid: string, templateId: string): Promise<void> {
  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalTemplates().filter((t) => t.id !== templateId);
    saveLocalTemplates(list);
    return;
  }

  const docRef = doc(db, "users", uid, "taskTemplates", templateId);
  await deleteDoc(docRef);
}

/**
 * Idempotently generates task instances from active templates for a local date.
 */
export async function generateDailyInstances(
  uid: string,
  localDate: string,
  timeZone: string
): Promise<{ createdCount: number }> {
  const templates = await getTemplates(uid);
  const existingTasks = await getTasksForDate(uid, localDate);
  const existingTemplateIds = new Set(
    existingTasks.map((t) => t.templateId).filter(Boolean)
  );

  let createdCount = 0;
  const currentWeekday = getWeekdayIndex(localDate); // 0=Sun .. 6=Sat

  for (const template of templates) {
    if (!template.isActive) continue;

    // Check date bounds
    if (template.recurrence.startDate && localDate < template.recurrence.startDate) {
      continue;
    }
    if (template.recurrence.endDate && localDate > template.recurrence.endDate) {
      continue;
    }

    // Check if instance already exists
    if (existingTemplateIds.has(template.id)) {
      continue;
    }

    let isEligible = false;
    if (template.recurrence.type === "daily") {
      isEligible = true;
    } else if (template.recurrence.type === "selected-weekdays") {
      if (template.recurrence.weekdays?.includes(currentWeekday)) {
        isEligible = true;
      }
    } else if (template.recurrence.type === "weekly") {
      const startWeekday = template.recurrence.startDate
        ? getWeekdayIndex(template.recurrence.startDate)
        : 1;
      if (currentWeekday === startWeekday) {
        isEligible = true;
      }
    } else if (template.recurrence.type === "once") {
      if (template.recurrence.startDate === localDate) {
        isEligible = true;
      }
    }

    if (isEligible) {
      const deterministicId = `inst_${template.id}_${localDate}`;
      const taskData: Omit<TaskItem, "id" | "createdAt" | "updatedAt"> = {
        title: template.title,
        description: template.description,
        date: localDate,
        timeZone,
        status: "todo",
        priority: template.priority,
        categoryId: template.categoryId,
        templateId: template.id,
        dueTime: template.dueTime,
        origin: "template",
        idempotencyKey: deterministicId,
        target: template.target
          ? {
              value: template.target.value,
              unit: template.target.unit,
              progress: 0,
            }
          : undefined,
      };

      await createTask(uid, taskData, deterministicId);
      createdCount++;
    }
  }

  return { createdCount };
}
