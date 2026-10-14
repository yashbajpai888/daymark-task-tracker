"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAuth } from "@/lib/auth/AuthContext";
import { TaskItem, Category } from "@/types";
import { getLocalDateString } from "@/lib/dates";
import {
  getTasksForDate,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  cancelTask,
  updateTaskTargetProgress,
} from "@/lib/tasks/taskService";
import { getCategories, createCategory, deleteCategory } from "@/lib/categories/categoryService";
import { Briefcase, FolderPlus, Plus, Tag, Trash2 } from "lucide-react";

export default function WorkPage() {
  const { user, profile } = useAuth();
  const timeZone = profile?.timeZone || "Asia/Kolkata";
  const uid = user?.uid || "local_user";

  const [todayStr, setTodayStr] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [taskFormOpen, setTaskFormOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const loadData = async (currentDay: string) => {
    if (!currentDay) return;
    setLoading(true);
    try {
      const [cats, dayTasks] = await Promise.all([
        getCategories(uid),
        getTasksForDate(uid, currentDay),
      ]);
      setCategories(cats);
      if (!selectedCategory && cats.length > 0) {
        const workCat = cats.find((c) => c.slug === "work") || cats[0];
        setSelectedCategory(workCat);
      }
      setTasks(dayTasks);
    } catch (err) {
      console.error("Error loading work workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = getLocalDateString(timeZone);
    setTodayStr(today);
    loadData(today);
  }, [uid, timeZone]);

  const handleAddCategory = async () => {
    const name = prompt("Enter new category name:");
    if (!name?.trim()) return;
    const newCat = await createCategory(uid, {
      name: name.trim(),
      slug: name.trim().toLowerCase().replace(/\s+/g, "-"),
      kind: "custom",
      accentKey: "mint",
      sortOrder: categories.length,
      isArchived: false,
    });
    setCategories([...categories, newCat]);
    setSelectedCategory(newCat);
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (cat.kind === "built-in") {
      alert("Built-in categories cannot be deleted.");
      return;
    }
    if (confirm(`Delete category "${cat.name}"? Existing tasks will remain uncategorized.`)) {
      await deleteCategory(uid, cat.id || cat.slug);
      const remaining = categories.filter((c) => c.id !== cat.id);
      setCategories(remaining);
      setSelectedCategory(remaining[0] || null);
    }
  };

  const filteredTasks = selectedCategory
    ? tasks.filter(
        (t) =>
          t.categoryId === selectedCategory.id ||
          t.categoryId === selectedCategory.slug
      )
    : tasks;

  return (
    <AppShell categories={categories}>
      <PageHeader
        title="Work & Projects"
        subtitle="Organize work by workspace, project tabs, and custom categories."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={handleAddCategory}>
              <FolderPlus className="w-4 h-4 mr-1.5" />
              <span>New Category</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setEditingTask(null);
                setTaskFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Add Task</span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Categories Rail */}
        <div className="md:col-span-1 space-y-2">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block px-1 mb-2">
            Workspaces
          </span>
          <div className="space-y-1">
            {categories.map((cat) => {
              const isSelected = selectedCategory?.id === cat.id;
              return (
                <div
                  key={cat.id || cat.slug}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-surface-elevated text-accent border-accent/40"
                      : "bg-surface text-text-secondary hover:text-text-primary border-border"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className="flex items-center gap-2.5 truncate flex-1 text-left"
                  >
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{cat.name}</span>
                  </button>

                  {cat.kind === "custom" && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger p-1 rounded"
                      title="Delete category"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks in Selected Category */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">
                {selectedCategory ? selectedCategory.name : "All Tasks"}
              </h3>
              <p className="text-xs text-text-secondary">
                {filteredTasks.length} task{filteredTasks.length === 1 ? "" : "s"} in this category
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                <TaskRowSkeleton />
                <TaskRowSkeleton />
              </div>
            ) : filteredTasks.length === 0 ? (
              <EmptyState
                icon={<Briefcase className="w-8 h-8 text-accent/60" />}
                title={`No tasks in "${selectedCategory?.name || "Work"}"`}
                description="Assign tasks to this workspace to track deliverables and projects."
                actionLabel="Create Task"
                onAction={() => {
                  setEditingTask(null);
                  setTaskFormOpen(true);
                }}
              />
            ) : (
              filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  category={selectedCategory || undefined}
                  onToggleStatus={(t) =>
                    toggleTaskStatus(uid, t.id, t.status).then(() => loadData(todayStr))
                  }
                  onCancelTask={(id) => cancelTask(uid, id).then(() => loadData(todayStr))}
                  onDeleteTask={(id) => deleteTask(uid, id).then(() => loadData(todayStr))}
                  onEditTask={(t) => {
                    setEditingTask(t);
                    setTaskFormOpen(true);
                  }}
                  onUpdateTargetProgress={(id, progress) =>
                    updateTaskTargetProgress(uid, id, progress).then(() => loadData(todayStr))
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Task Form Modal */}
      {todayStr && (
        <TaskForm
          open={taskFormOpen}
          onClose={() => {
            setTaskFormOpen(false);
            setEditingTask(null);
          }}
          onSubmit={async (data) => {
            if (editingTask) {
              await updateTask(uid, editingTask.id, data);
            } else {
              await createTask(uid, {
                ...data,
                categoryId: selectedCategory?.id || data.categoryId,
              });
            }
            await loadData(todayStr);
          }}
          initialTask={editingTask}
          defaultDate={todayStr}
          categories={categories}
        />
      )}
    </AppShell>
  );
}
