import { db, canAccessFirestore } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { TaskItem, CarryForwardDecision } from "@/types";
import { getTasksForDate, createTask } from "./taskService";

const LOCAL_STORAGE_DECISIONS_KEY = "daymark_local_cf_decisions";

function getLocalDecisions(): Record<string, CarryForwardDecision> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(LOCAL_STORAGE_DECISIONS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveLocalDecisions(decisions: Record<string, CarryForwardDecision>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_DECISIONS_KEY, JSON.stringify(decisions));
}

/**
 * Checks whether a decision has already been recorded for destinationDate.
 */
export async function getCarryForwardDecision(
  uid: string,
  destinationDate: string
): Promise<CarryForwardDecision | null> {
  if (!canAccessFirestore(uid) || !db) {
    const decs = getLocalDecisions();
    return decs[destinationDate] || null;
  }

  try {
    const docRef = doc(db, "users", uid, "carryForwardDecisions", destinationDate);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as CarryForwardDecision;
    }
    return null;
  } catch (err) {
    console.error("Error fetching carry forward decision:", err);
    const decs = getLocalDecisions();
    return decs[destinationDate] || null;
  }
}

/**
 * Finds eligible pending tasks from sourceDate that can be carried forward to destinationDate.
 */
export async function getEligiblePendingTasks(
  uid: string,
  sourceDate: string,
  destinationDate: string
): Promise<TaskItem[]> {
  const sourceTasks = await getTasksForDate(uid, sourceDate);
  const destTasks = await getTasksForDate(uid, destinationDate);

  // Set of source task IDs already carried forward to destinationDate
  const alreadyCarriedSourceIds = new Set(
    destTasks.map((t) => t.sourceTaskId).filter(Boolean)
  );

  // Set of template IDs that already exist on destinationDate
  const destTemplateIds = new Set(
    destTasks.map((t) => t.templateId).filter(Boolean)
  );

  return sourceTasks.filter((t) => {
    // Only incomplete tasks
    if (t.status !== "todo") return false;

    // Do not carry forward if already carried forward to destination date
    if (alreadyCarriedSourceIds.has(t.id)) return false;

    // Do not carry forward recurring habit templates if they already generated today
    if (t.templateId && destTemplateIds.has(t.templateId)) return false;

    return true;
  });
}

/**
 * Executes the carry-forward decision (either accept selected or decline).
 */
export async function processCarryForwardDecision(params: {
  uid: string;
  sourceDate: string;
  destinationDate: string;
  timeZone: string;
  decision: "accepted" | "declined";
  selectedTaskIds: string[];
}): Promise<{ copiedCount: number }> {
  const { uid, sourceDate, destinationDate, timeZone, decision, selectedTaskIds } = params;
  let copiedCount = 0;

  if (decision === "accepted" && selectedTaskIds.length > 0) {
    const sourceTasks = await getTasksForDate(uid, sourceDate);
    const tasksToCopy = sourceTasks.filter((t) => selectedTaskIds.includes(t.id));

    for (const sourceTask of tasksToCopy) {
      const deterministicCopyId = `cf_${sourceTask.id}_${destinationDate}`;

      const newTaskData: Omit<TaskItem, "id" | "createdAt" | "updatedAt"> = {
        title: sourceTask.title,
        description: sourceTask.description,
        date: destinationDate,
        timeZone,
        status: "todo",
        priority: sourceTask.priority,
        categoryId: sourceTask.categoryId,
        projectId: sourceTask.projectId,
        sourceTaskId: sourceTask.id,
        carriedFromDate: sourceDate,
        dueTime: sourceTask.dueTime,
        origin: "carry-forward",
        idempotencyKey: deterministicCopyId,
        subtasks: sourceTask.subtasks?.map((s) => ({ ...s, isCompleted: false })),
        target: sourceTask.target
          ? {
              value: sourceTask.target.value,
              unit: sourceTask.target.unit,
              progress: 0,
            }
          : undefined,
      };

      await createTask(uid, newTaskData, deterministicCopyId);
      copiedCount++;
    }
  }

  // Record the decision so the prompt is not shown again for this destinationDate
  const decisionRecord: CarryForwardDecision = {
    destinationDate,
    sourceDate,
    decision,
    selectedSourceTaskIds: decision === "accepted" ? selectedTaskIds : [],
    createdAt: Date.now(),
  };

  if (!canAccessFirestore(uid) || !db) {
    const decs = getLocalDecisions();
    decs[destinationDate] = decisionRecord;
    saveLocalDecisions(decs);
  } else {
    try {
      const docRef = doc(db, "users", uid, "carryForwardDecisions", destinationDate);
      await setDoc(docRef, {
        ...decisionRecord,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error saving carry forward decision to Firestore:", err);
      const decs = getLocalDecisions();
      decs[destinationDate] = decisionRecord;
      saveLocalDecisions(decs);
    }
  }

  return { copiedCount };
}
