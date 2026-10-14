"use client";

import React, { useEffect, useState } from "react";
import { subscribeForegroundMessages } from "@/lib/firebase/messaging";
import { Bell, X, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ForegroundToast {
  id: string;
  title: string;
  body: string;
  url?: string;
}

export const ServiceWorkerRegister: React.FC = () => {
  const [toast, setToast] = useState<ForegroundToast | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Register PWA & FCM Service Worker
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js", { scope: "/" })
      .then((reg) => {
        // Check for updates periodically
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn("Service worker registration error:", err);
      });

    // Subscribe to foreground FCM messages
    const unsubscribe = subscribeForegroundMessages((payload) => {
      setToast({
        id: `toast_${Date.now()}`,
        title: payload.title,
        body: payload.body,
        url: payload.data?.url || "/daily",
      });

      // Also trigger browser notification if permission is already granted
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(payload.title, {
            body: payload.body,
            icon: "/icons/icon-192.png",
          });
        } catch {
          // Some mobile browsers require serviceWorker.showNotification
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-dismiss foreground toast after 6 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-2 duration-200">
      <div className="bg-surface border border-blue-200 shadow-xl rounded-xl p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
          <Bell className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-text-primary truncate">{toast.title}</h4>
          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{toast.body}</p>
          {toast.url && (
            <Link
              href={toast.url}
              onClick={() => setToast(null)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 mt-2"
            >
              <span>View in Daymark</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setToast(null)}
          className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
