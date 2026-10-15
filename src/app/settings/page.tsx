"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { ReminderSettings, Category, CustomReminder, NotificationHistoryItem } from "@/types";
import {
  getReminderSettings,
  saveReminderSettings,
} from "@/lib/reminders/reminderService";
import {
  getCustomReminders,
  createCustomReminder,
  updateCustomReminder,
  deleteCustomReminder,
  getNotificationHistory,
  clearNotificationHistory,
  PRESET_REMINDERS,
} from "@/lib/reminders/customReminderService";
import {
  checkPushSupport,
  requestAndRegisterPushToken,
  PushSupportInfo,
} from "@/lib/firebase/messaging";
import { getCategories } from "@/lib/categories/categoryService";
import { CustomReminderModal } from "@/components/notifications/CustomReminderModal";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import {
  Bell,
  BellRing,
  Clock,
  Download,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Dumbbell,
  Footprints,
  Droplet,
  Trash2,
  Edit2,
  Smartphone,
  Share2,
  Volume2,
} from "lucide-react";

export default function SettingsPage() {
  const { user, profile, getIdToken } = useAuth();
  const uid = user?.uid || "local_user";

  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: false, // Email reminders disabled by default
    pushEnabled: false,
    destinationEmail: profile?.email || "",
    emailVerified: false,
    timeZone: profile?.timeZone || "Asia/Kolkata",
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
  });

  const [customReminders, setCustomReminders] = useState<CustomReminder[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryItem[]>([]);
  const [pushSupport, setPushSupport] = useState<PushSupportInfo | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pushEnabling, setPushEnabling] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);
  const [pushResult, setPushResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  // Modals
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<CustomReminder | null>(null);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    async function load() {
      const [cats, remSettings, customRems, history, support] = await Promise.all([
        getCategories(uid),
        getReminderSettings(uid),
        getCustomReminders(uid),
        getNotificationHistory(uid, 5),
        checkPushSupport(),
      ]);

      setCategories(cats);
      if (remSettings) {
        setSettings(remSettings);
      }
      setCustomReminders(customRems);
      setNotificationHistory(history);
      setUnreadNotifCount(history.filter((h) => !h.read).length);
      setPushSupport(support);
    }
    load();
  }, [uid]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await saveReminderSettings(uid, settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving reminder preferences:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEnablePush = async () => {
    setPushEnabling(true);
    setPushResult(null);
    try {
      // Pass getIdToken directly so Notification.requestPermission() is called
      // on the very first synchronous tick of user tap (required by iOS Safari!)
      const res = await requestAndRegisterPushToken(getIdToken);
      if (res.success) {
        setSettings((prev) => ({ ...prev, pushEnabled: true }));
        await saveReminderSettings(uid, { ...settings, pushEnabled: true });
        const updatedSupport = await checkPushSupport();
        setPushSupport(updatedSupport);
        setPushResult({
          success: true,
          message: "Push notifications enabled! Your device is registered to receive scheduled reminders.",
        });
      } else {
        setPushResult({
          success: false,
          error: res.error || "Failed to enable push notifications.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error enabling notifications";
      setPushResult({ success: false, error: msg });
    } finally {
      setPushEnabling(false);
    }
  };

  const handleSendTestPush = async () => {
    setPushTesting(true);
    setPushResult(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setPushResult({
          success: false,
          error: "You must be signed in with Firebase to send a live test notification to your device.",
        });
        return;
      }

      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "Daymark — Test Push Notification",
          body: "Your Web Push notifications and custom reminder delivery are fully operational!",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPushResult({
          success: true,
          message: data.message || "Test push notification successfully sent to your device!",
        });
        // Refresh notification history
        const updatedHistory = await getNotificationHistory(uid, 5);
        setNotificationHistory(updatedHistory);
      } else {
        setPushResult({
          success: false,
          error: data.error || "Failed to dispatch test notification.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error triggering test push";
      setPushResult({ success: false, error: msg });
    } finally {
      setPushTesting(false);
    }
  };

  const handleCreateOrUpdateReminder = async (
    data: Omit<CustomReminder, "id" | "createdAt" | "updatedAt">
  ) => {
    if (editingReminder) {
      await updateCustomReminder(uid, editingReminder.id, data);
      setCustomReminders((prev) =>
        prev.map((r) => (r.id === editingReminder.id ? { ...r, ...data, updatedAt: Date.now() } : r))
      );
    } else {
      const newReminder = await createCustomReminder(uid, data);
      setCustomReminders((prev) => [...prev, newReminder]);
    }
  };

  const handleToggleReminder = async (id: string, enabled: boolean) => {
    await updateCustomReminder(uid, id, { enabled });
    setCustomReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled } : r))
    );
  };

  const handleDeleteReminder = async (id: string) => {
    await deleteCustomReminder(uid, id);
    setCustomReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddPreset = async (preset: (typeof PRESET_REMINDERS)[0]) => {
    const newRem = await createCustomReminder(uid, {
      ...preset,
      timeZone: settings.timeZone,
    });
    setCustomReminders((prev) => [...prev, newRem]);
  };

  const handleExportData = async () => {
    try {
      const token = await getIdToken();
      if (!token) {
        const localTasks = localStorage.getItem("daymark_local_tasks");
        const localTemplates = localStorage.getItem("daymark_local_templates");
        const exportObj = {
          exportedAt: new Date().toISOString(),
          tasks: localTasks ? JSON.parse(localTasks) : [],
          templates: localTemplates ? JSON.parse(localTemplates) : [],
          customReminders,
          categories,
        };
        const blob = new Blob([JSON.stringify(exportObj, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `daymark-export-${Date.now()}.json`;
        a.click();
        return;
      }

      const res = await fetch("/api/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `daymark-export-${Date.now()}.json`;
        a.click();
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const renderCategoryIcon = (cat: string) => {
    switch (cat) {
      case "gym":
        return <Dumbbell className="w-4 h-4 text-orange-500" />;
      case "running":
        return <Footprints className="w-4 h-4 text-emerald-500" />;
      case "water":
        return <Droplet className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <AppShell categories={categories}>
      <PageHeader
        title="Settings & Reminders"
        subtitle="Manage Web Push notifications, custom habit schedules, time zone, and security."
      />

      <div className="space-y-8 max-w-4xl">
        {/* 1. Web Push Notification Configuration Card */}
        <div className="p-5 rounded-xl border border-border bg-surface space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">
                  Web Push Notifications
                </h3>
                <p className="text-xs text-text-secondary">
                  Receive scheduled notifications on mobile and desktop even when the website is closed.
                </p>
              </div>
            </div>

            {/* Permission Badge */}
            <div className="flex items-center gap-2">
              {pushSupport?.permission === "granted" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Permission Granted</span>
                </span>
              ) : pushSupport?.permission === "denied" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Blocked in Browser</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Not Enabled</span>
                </span>
              )}
            </div>
          </div>

          {/* iOS Safari Home Screen Notice */}
          {pushSupport?.isIOS && !pushSupport?.isStandalone && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 flex items-start gap-3 text-xs text-blue-900">
              <Smartphone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">iOS / iPadOS Web Push Setup:</span>
                <p className="leading-relaxed">
                  Apple requires Web Push apps to run as an installed Home Screen app. Tap the Safari{" "}
                  <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-700" /> <strong>Share</strong> button, select{" "}
                  <strong>&apos;Add to Home Screen&apos;</strong>, and then open Daymark from your Home Screen to enable push notifications.
                </p>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-text-primary block">
                Notification Delivery Status
              </span>
              <p className="text-xs text-text-secondary">
                {settings.pushEnabled
                  ? "Scheduled reminders will be delivered to registered devices."
                  : "Push notifications are currently disabled."}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant={pushSupport?.permission === "granted" ? "secondary" : "primary"}
                loading={pushEnabling}
                onClick={handleEnablePush}
              >
                <Bell className="w-4 h-4 mr-1.5" />
                <span>
                  {pushSupport?.permission === "granted" ? "Re-sync Token" : "Enable Push Notifications"}
                </span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                loading={pushTesting}
                onClick={handleSendTestPush}
                disabled={pushSupport?.permission !== "granted"}
                title={
                  pushSupport?.permission !== "granted"
                    ? "Enable notifications first to test"
                    : "Send a live push notification"
                }
              >
                <BellRing className="w-4 h-4 mr-1.5 text-blue-600" />
                <span>Test Push</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setNotificationCenterOpen(true)}
              >
                <span>History ({unreadNotifCount})</span>
              </Button>
            </div>
          </div>

          {/* OS-Level Troubleshooting Guide */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
            <span className="font-semibold text-slate-900 block flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              OS Notification Permissions Checklist
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-600 pt-1">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-800 block">💻 Laptop (Windows / Mac)</span>
                <p className="text-[11px] leading-relaxed">
                  Ensure Windows <strong>Focus Assist</strong> or Mac <strong>Do Not Disturb</strong> is off, and notifications are allowed for Chrome/Edge in Windows Settings &gt; System &gt; Notifications.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-800 block">🤖 Android</span>
                <p className="text-[11px] leading-relaxed">
                  Go to Android <strong>Settings &gt; Apps &gt; Chrome &gt; Notifications</strong> and ensure &apos;All Chrome notifications&apos; is switched on with sound enabled.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-800 block">📱 iPhone (iOS 16.4+)</span>
                <p className="text-[11px] leading-relaxed">
                  Daymark must be launched from your Home Screen. Check iPhone <strong>Settings &gt; Notifications &gt; Daymark</strong> to ensure &apos;Allow Notifications&apos; is active.
                </p>
              </div>
            </div>
          </div>

          {pushResult && (
            <FeedbackBanner
              type={pushResult.success ? "success" : "error"}
              title={pushResult.success ? "Push Notification Active" : "Notification Error"}
              message={pushResult.message || pushResult.error || ""}
              onDismiss={() => setPushResult(null)}
            />
          )}
        </div>

        {/* 2. Custom Reminders & Habits Management Card */}
        <div className="p-5 rounded-xl border border-border bg-surface space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">
                  Custom Reminders &amp; Daily Routines
                </h3>
                <p className="text-xs text-text-secondary">
                  Configure specific reminders for workouts, running, water hydration, or daily focus goals.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingReminder(null);
                setReminderModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Add Reminder</span>
            </Button>
          </div>

          {/* Quick Preset Cards */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
              One-Click Habit Presets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/40 flex flex-col justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text-primary">Gym Workout</h4>
                    <span className="text-[11px] text-text-secondary">Daily at 07:00 AM</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddPreset(PRESET_REMINDERS[0])}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Gym</span>
                </Button>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/40 flex flex-col justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                    <Footprints className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text-primary">Morning Run</h4>
                    <span className="text-[11px] text-text-secondary">Daily at 06:30 AM</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddPreset(PRESET_REMINDERS[1])}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Run</span>
                </Button>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/40 flex flex-col justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Droplet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text-primary">Hydration Intake</h4>
                    <span className="text-[11px] text-text-secondary">Every 2 Hours</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddPreset(PRESET_REMINDERS[2])}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Water</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Active Custom Reminders List */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
              Configured Reminders ({customReminders.length})
            </span>

            {customReminders.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-surface-elevated/20 text-xs text-text-secondary">
                No custom reminders created yet. Use the presets above or click &quot;Add Reminder&quot; to schedule notifications.
              </div>
            ) : (
              <div className="space-y-2">
                {customReminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-surface-elevated shrink-0">
                        {renderCategoryIcon(rem.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text-primary truncate">
                            {rem.title}
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary border border-border shrink-0">
                            {rem.repeatType === "interval"
                              ? `Every ${Math.round((rem.intervalMinutes || 120) / 60)}h`
                              : rem.reminderTime}
                          </span>
                        </div>
                        {rem.description && (
                          <p className="text-[11px] text-text-secondary truncate mt-0.5">
                            {rem.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-text-secondary">
                        <input
                          type="checkbox"
                          checked={rem.enabled}
                          onChange={(e) => handleToggleReminder(rem.id, e.target.checked)}
                          className="w-4 h-4 accent-blue-600 rounded"
                        />
                        <span className="hidden sm:inline">
                          {rem.enabled ? "Active" : "Paused"}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingReminder(rem);
                          setReminderModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                        title="Edit Reminder"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
                        title="Delete Reminder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. General Reminder Preferences (Timezone, Quiet Hours) */}
        <form onSubmit={handleSavePreferences} className="p-5 rounded-xl border border-border bg-surface space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-accent" />
              <h3 className="text-base font-semibold text-text-primary">
                Timezone &amp; Quiet Hours
              </h3>
            </div>

            <span className="text-[11px] font-mono font-medium text-text-secondary bg-surface-elevated px-2 py-0.5 rounded">
              Email Reminders Disabled by Default
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Time Zone"
              value={settings.timeZone}
              onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
              hint="IANA identifier (defaults to Asia/Kolkata)."
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary block">
                Notification Sound &amp; Vibration
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-text-secondary pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled ?? true}
                  onChange={(e) =>
                    setSettings({ ...settings, soundEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span>Play sound and vibration on push delivery</span>
              </label>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="p-4 rounded-lg border border-border bg-surface-elevated/30 space-y-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={settings.quietHours?.enabled ?? true}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    quietHours: {
                      start: settings.quietHours?.start || "22:00",
                      end: settings.quietHours?.end || "07:00",
                      enabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-blue-600 rounded"
              />
              <span>Quiet Hours (Suppress notifications during sleep/focus)</span>
            </label>

            <div className="grid grid-cols-2 gap-3 pl-6">
              <Input
                label="Start Quiet Hours"
                type="time"
                value={settings.quietHours?.start || "22:00"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    quietHours: {
                      enabled: settings.quietHours?.enabled ?? true,
                      start: e.target.value,
                      end: settings.quietHours?.end || "07:00",
                    },
                  })
                }
              />
              <Input
                label="End Quiet Hours"
                type="time"
                value={settings.quietHours?.end || "07:00"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    quietHours: {
                      enabled: settings.quietHours?.enabled ?? true,
                      start: settings.quietHours?.start || "22:00",
                      end: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>

          {saveSuccess && (
            <FeedbackBanner
              type="success"
              message="Reminder preferences saved successfully."
            />
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <Button type="submit" variant="primary" loading={saving}>
              Save Preferences
            </Button>
          </div>
        </form>

        {/* 4. Credentials Checklist */}
        <div className="p-5 rounded-xl border border-border bg-surface space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <KeyRound className="w-5 h-5 text-accent" />
            <h3 className="text-base font-semibold text-text-primary">
              Firebase &amp; Web Push Credentials Checklist
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg border border-border bg-surface-elevated/40 space-y-2">
              <span className="font-semibold text-text-primary block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                1. Firebase Client &amp; Web Push (FCM)
              </span>
              <ul className="text-text-secondary space-y-1 list-disc list-inside">
                <li><code className="text-text-primary">NEXT_PUBLIC_FIREBASE_API_KEY</code></li>
                <li><code className="text-text-primary">NEXT_PUBLIC_FIREBASE_PROJECT_ID</code></li>
                <li><code className="text-text-primary">NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</code></li>
                <li><code className="text-text-primary">NEXT_PUBLIC_FIREBASE_VAPID_KEY</code> (Web Push Certificate)</li>
              </ul>
              <span className="text-[11px] text-text-secondary block pt-1">
                Generate VAPID Key in Firebase Console &gt; Project Settings &gt; Cloud Messaging &gt; Web configuration.
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-surface-elevated/40 space-y-2">
              <span className="font-semibold text-text-primary block flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-blue-600" />
                2. Server-Side Push Dispatch
              </span>
              <ul className="text-text-secondary space-y-1 list-disc list-inside">
                <li><code className="text-text-primary">FIREBASE_PROJECT_ID</code></li>
                <li><code className="text-text-primary">FIREBASE_CLIENT_EMAIL</code></li>
                <li><code className="text-text-primary">FIREBASE_PRIVATE_KEY</code></li>
                <li><code className="text-text-primary">CRON_SECRET</code> (for /api/reminders/cron)</li>
              </ul>
              <span className="text-[11px] text-text-secondary block pt-1">
                Used securely on the server to send push notifications via Firebase Admin SDK.
              </span>
            </div>
          </div>
        </div>

        {/* 5. Data Privacy & Export */}
        <div className="p-5 rounded-xl border border-border bg-surface flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Export Application Data</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Download your complete task history, habit templates, custom reminders, and workspace categories as JSON.
            </p>
          </div>

          <Button variant="secondary" size="md" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-1.5" />
            <span>Export JSON</span>
          </Button>
        </div>
      </div>

      {/* Custom Reminder Modal */}
      <CustomReminderModal
        open={reminderModalOpen}
        onClose={() => {
          setReminderModalOpen(false);
          setEditingReminder(null);
        }}
        onSubmit={handleCreateOrUpdateReminder}
        initialReminder={editingReminder}
        timeZone={settings.timeZone}
      />

      {/* In-app Notification Center Drawer */}
      <NotificationCenter
        open={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        onUpdateUnreadCount={(count) => setUnreadNotifCount(count)}
      />
    </AppShell>
  );
}
