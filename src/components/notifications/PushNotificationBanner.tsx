"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  checkPushSupport,
  requestAndRegisterPushToken,
  PushSupportInfo,
} from "@/lib/firebase/messaging";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  Bell,
  BellRing,
  Smartphone,
  Share2,
  CheckCircle2,
  X,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export const PushNotificationBanner: React.FC = () => {
  const { user, getIdToken } = useAuth();
  const [supportInfo, setSupportInfo] = useState<PushSupportInfo | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [testing, setTesting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem("daymark_dismiss_push_banner") === "1";
    if (isDismissed) {
      setDismissed(true);
    }

    checkPushSupport().then((info) => {
      setSupportInfo(info);
    });
  }, [user]);

  // If already dismissed, unsupported SSR, or permission is already granted and no recent action:
  if (dismissed || !supportInfo || !user) {
    return null;
  }

  // If permission is already granted and no active status message, hide banner to keep dashboard clean
  if (supportInfo.permission === "granted" && !statusMessage) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("daymark_dismiss_push_banner", "1");
  };

  const handleEnable = async () => {
    setEnabling(true);
    setStatusMessage(null);
    try {
      const res = await requestAndRegisterPushToken(getIdToken);
      if (res.success) {
        const updated = await checkPushSupport();
        setSupportInfo(updated);
        setStatusMessage({
          type: "success",
          text: "Push notifications active! Scheduled reminders will be delivered to this device.",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Could not enable push notifications. Check browser permissions.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error enabling notifications";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setEnabling(false);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    try {
      const token = await getIdToken();
      if (!token) {
        setStatusMessage({
          type: "error",
          text: "You must be signed in to dispatch a test notification.",
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
          title: "Daymark — Push Verified! 🚀",
          body: "Your device is connected and ready to receive scheduled task & habit reminders.",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: "success",
          text: "Test notification dispatched! Check your notification tray.",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to deliver test notification.",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Network error sending test push notification.",
      });
    } finally {
      setTesting(false);
    }
  };

  // Case 1: iOS Safari outside Standalone Mode (Home Screen PWA required)
  if (supportInfo.isIOS && !supportInfo.isStandalone) {
    return (
      <div className="mb-6 p-4 rounded-2xl border border-blue-200 bg-blue-50/80 shadow-xs relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5 shadow-sm shadow-blue-600/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-blue-950">
                Enable Reminders on iPhone / iPad
              </h3>
              <p className="text-xs text-blue-800 leading-relaxed max-w-2xl">
                Apple requires Daymark to be installed to your Home Screen for push notifications:
                tap Safari&apos;s <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-700" />{" "}
                <strong>Share</strong> button, tap <strong>&apos;Add to Home Screen&apos;</strong>, then open Daymark from your Home Screen.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-blue-700 hover:text-blue-900 hover:bg-blue-100 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Case 2: Permission Blocked in Browser
  if (supportInfo.permission === "denied") {
    return (
      <div className="mb-6 p-4 rounded-2xl border border-amber-200 bg-amber-50/80 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-amber-950">
                Push Notifications are Blocked in Browser
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Notifications are blocked for this site. Click the site settings icon in your browser URL bar, change Notifications to <strong>Allow</strong>, and refresh the page to receive timely task reminders.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-amber-700 hover:text-amber-900 hover:bg-amber-100 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Case 3: Permission Granted with active success state (allows instant 1-click testing)
  if (supportInfo.permission === "granted" && statusMessage?.type === "success") {
    return (
      <div className="mb-6 p-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-950">
              Push Notifications Operational
            </h3>
            <p className="text-xs text-emerald-800">{statusMessage.text}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={testing}
            onClick={handleSendTest}
            className="bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100/50"
          >
            <BellRing className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            <span>Send Live Test</span>
          </Button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Case 4: Default prompt — Permission Not Yet Granted
  return (
    <div className="mb-6 p-4 sm:p-5 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-sm shadow-blue-600/20">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Never miss your tasks or daily habits
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Recommended
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              Enable push notifications to receive real-time alerts on your laptop, Android, or iPhone for gym routines, water intake, and scheduled due times.
            </p>
            {statusMessage?.type === "error" && (
              <p className="text-xs font-semibold text-rose-600 pt-1">
                {statusMessage.text}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 sm:self-center">
          <Button
            type="button"
            variant="primary"
            size="sm"
            loading={enabling}
            onClick={handleEnable}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            <BellRing className="w-3.5 h-3.5 mr-1.5" />
            <span>Enable Notifications</span>
          </Button>

          <Link href="/settings">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="border-slate-200 text-slate-600 hover:bg-white"
            >
              <span>Manage</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors ml-1"
            title="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
