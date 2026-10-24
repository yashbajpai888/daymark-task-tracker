"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { ReminderSettings, Category, NotificationHistoryItem } from "@/types";
import {
  getReminderSettings,
  saveReminderSettings,
} from "@/lib/reminders/reminderService";
import {
  getNotificationHistory,
} from "@/lib/reminders/customReminderService";
import {
  checkPushSupport,
  requestAndRegisterPushToken,
  PushSupportInfo,
} from "@/lib/firebase/messaging";
import { getCategories } from "@/lib/categories/categoryService";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import {
  Bell,
  BellRing,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Share2,
  Volume2,
} from "lucide-react";

export default function SettingsPage() {
  const { user, profile, getIdToken } = useAuth();
  const uid = user?.uid || "local_user";

  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: false,
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

  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    async function load() {
      const [cats, remSettings, history, support] = await Promise.all([
        getCategories(uid),
        getReminderSettings(uid),
        getNotificationHistory(uid, 5),
        checkPushSupport(),
      ]);

      setCategories(cats);
      if (remSettings) {
        setSettings(remSettings);
      }
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
      const res = await requestAndRegisterPushToken(getIdToken);
      if (res.success) {
        setSettings((prev) => ({ ...prev, pushEnabled: true }));
        await saveReminderSettings(uid, { ...settings, pushEnabled: true });
        const updatedSupport = await checkPushSupport();
        setPushSupport(updatedSupport);
        setPushResult({
          success: true,
          message: "Push notifications enabled! This device is registered to receive alerts.",
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
          error: "You must be signed in with Firebase to send a live test notification.",
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
          body: "Push notification system is working! You will receive scheduled task alerts.",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPushResult({
          success: true,
          message: data.message || "Test push notification successfully sent to your device!",
        });
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

  return (
    <AppShell categories={categories}>
      <PageHeader
        title="Settings & Notifications"
        subtitle="Manage push notification permissions, time zone, and quiet hours."
      />

      <div className="space-y-6 max-w-3xl">
        {/* 1. Web Push Notification Status Card */}
        <div className="p-5 rounded-xl border border-border bg-surface space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">
                  Push Notifications
                </h3>
                <p className="text-xs text-text-secondary">
                  Receive task reminders on your phone or laptop at scheduled times.
                </p>
              </div>
            </div>

            {/* Permission Badge */}
            <div className="flex items-center gap-2">
              {pushSupport?.permission === "granted" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enabled on this Device</span>
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
                <span className="font-semibold block">iOS Setup Required:</span>
                <p className="leading-relaxed">
                  Apple requires Web Push apps to run from your Home Screen. Tap Safari&apos;s{" "}
                  <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-700" /> <strong>Share</strong> button, select{" "}
                  <strong>&apos;Add to Home Screen&apos;</strong>, then open Daymark from your Home Screen.
                </p>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-text-primary block">
                Notification Delivery
              </span>
              <p className="text-xs text-text-secondary">
                {settings.pushEnabled
                  ? "Reminders set on your tasks will ring on registered devices."
                  : "Push notifications are currently disabled."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
              <Button
                type="button"
                variant={pushSupport?.permission === "granted" ? "secondary" : "primary"}
                loading={pushEnabling}
                onClick={handleEnablePush}
                className="flex-1 sm:flex-initial min-w-[140px] justify-center text-xs sm:text-sm"
              >
                <Bell className="w-4 h-4 mr-1.5 shrink-0" />
                <span>
                  {pushSupport?.permission === "granted" ? "Re-sync Device" : "Enable Push Notifications"}
                </span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                loading={pushTesting}
                onClick={handleSendTestPush}
                disabled={pushSupport?.permission !== "granted"}
                className="flex-1 sm:flex-initial justify-center text-xs sm:text-sm"
                title={
                  pushSupport?.permission !== "granted"
                    ? "Enable notifications first to test"
                    : "Send a live push notification"
                }
              >
                <BellRing className="w-4 h-4 mr-1.5 text-blue-600 shrink-0" />
                <span>Test Notification</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setNotificationCenterOpen(true)}
                className="flex-1 sm:flex-initial justify-center text-xs sm:text-sm"
              >
                <span>History ({unreadNotifCount})</span>
              </Button>
            </div>
          </div>

          {/* OS-Level Troubleshooting Guide */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
            <span className="font-semibold text-slate-900 block flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Device Permission Tips</span>
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-600 pt-1">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-800 block">💻 Laptop (Windows / Mac)</span>
                <p className="text-[11px] leading-relaxed">
                  Make sure Windows <strong>Focus Assist</strong> or Mac <strong>Do Not Disturb</strong> is turned off so banners pop up.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-800 block">🤖 Android</span>
                <p className="text-[11px] leading-relaxed">
                  Go to <strong>Settings &gt; Apps &gt; Chrome &gt; Notifications</strong> and ensure Chrome notifications are allowed.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-800 block">📱 iPhone</span>
                <p className="text-[11px] leading-relaxed">
                  Launch Daymark from Home Screen. Check <strong>Settings &gt; Notifications &gt; Daymark</strong> to ensure alerts are active.
                </p>
              </div>
            </div>
          </div>

          {pushResult && (
            <FeedbackBanner
              type={pushResult.success ? "success" : "error"}
              title={pushResult.success ? "Notification Active" : "Notification Error"}
              message={pushResult.message || pushResult.error || ""}
              onDismiss={() => setPushResult(null)}
            />
          )}
        </div>

        {/* 2. Timezone & Quiet Hours */}
        <form onSubmit={handleSavePreferences} className="p-4 sm:p-5 rounded-xl border border-border bg-surface space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-accent" />
              <h3 className="text-base font-semibold text-text-primary">
                Timezone &amp; Quiet Hours
              </h3>
            </div>
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
                <Volume2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Play sound and vibration on alert</span>
              </label>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="p-3.5 sm:p-4 rounded-lg border border-border bg-surface-elevated/30 space-y-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-0 sm:pl-6">
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
              message="Settings saved successfully."
            />
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <Button type="submit" variant="primary" loading={saving}>
              Save Preferences
            </Button>
          </div>
        </form>
      </div>

      {/* In-app Notification Center Drawer */}
      <NotificationCenter
        open={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        onUpdateUnreadCount={(count) => setUnreadNotifCount(count)}
      />
    </AppShell>
  );
}
