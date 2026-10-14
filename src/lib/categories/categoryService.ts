import { db, canAccessFirestore } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { Category } from "@/types";

const LOCAL_STORAGE_KEY = "daymark_local_categories";

const DEFAULT_CATEGORIES: Category[] = [
  { id: "daily", name: "Daily", slug: "daily", kind: "built-in", sortOrder: 0, isArchived: false, createdAt: Date.now(), updatedAt: Date.now() },
  { id: "work", name: "Work", slug: "work", kind: "built-in", sortOrder: 1, isArchived: false, createdAt: Date.now(), updatedAt: Date.now() },
  { id: "habits", name: "Habits", slug: "habits", kind: "built-in", sortOrder: 2, isArchived: false, createdAt: Date.now(), updatedAt: Date.now() },
];

function getLocalCategories(): Category[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function saveLocalCategories(cats: Category[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cats));
}

export async function getCategories(uid: string): Promise<Category[]> {
  if (!canAccessFirestore(uid) || !db) {
    return getLocalCategories();
  }

  try {
    const colRef = collection(db, "users", uid, "categories");
    const q = query(colRef, orderBy("sortOrder", "asc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Seed default categories
      for (const defCat of DEFAULT_CATEGORIES) {
        const catDoc = doc(db, "users", uid, "categories", defCat.slug);
        await setDoc(catDoc, {
          ...defCat,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return DEFAULT_CATEGORIES;
    }

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Category[];
  } catch (err) {
    console.error("Error fetching categories:", err);
    return getLocalCategories();
  }
}

export async function createCategory(
  uid: string,
  category: Omit<Category, "id" | "createdAt" | "updatedAt">
): Promise<Category> {
  const newId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullCategory: Category = {
    ...category,
    id: newId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalCategories();
    list.push(fullCategory);
    saveLocalCategories(list);
    return fullCategory;
  }

  const docRef = doc(db, "users", uid, "categories", newId);
  await setDoc(docRef, {
    ...category,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return fullCategory;
}

export async function updateCategory(
  uid: string,
  categoryId: string,
  updates: Partial<Category>
): Promise<void> {
  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalCategories();
    const idx = list.findIndex((c) => c.id === categoryId || c.slug === categoryId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates, updatedAt: Date.now() };
      saveLocalCategories(list);
    }
    return;
  }

  const docRef = doc(db, "users", uid, "categories", categoryId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCategory(
  uid: string,
  categoryId: string,
  reassignToCategoryId?: string
): Promise<void> {
  if (!canAccessFirestore(uid) || !db) {
    const list = getLocalCategories().filter((c) => c.id !== categoryId && c.slug !== categoryId);
    saveLocalCategories(list);
    return;
  }

  // If reassignToCategoryId is specified or tasks need un-categorization, reassign them
  const tasksRef = collection(db, "users", uid, "tasks");
  const q = query(tasksRef, where("categoryId", "==", categoryId));
  const snap = await getDocs(q);

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, {
      categoryId: reassignToCategoryId || null,
      updatedAt: serverTimestamp(),
    });
  });

  const catRef = doc(db, "users", uid, "categories", categoryId);
  batch.delete(catRef);

  await batch.commit();
}
