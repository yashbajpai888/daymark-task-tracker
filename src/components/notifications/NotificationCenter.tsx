"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Dumbbell,
  Footprints,
  Droplet,
  CheckCircle2,
  Calendar,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { NotificationHistoryItem, CustomReminderCategory } from "@/types";
import {
  getNotificationHistory,
  markNotificationRead,
  clearNotificationHistory,
} from "@/lib/reminders/customReminderService";
import { useAuth } from "@/lib/auth/AuthContext";
import Link from "next/link";

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  onUpdateUnreadCount?: (count: number) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  open,
  onClose,
  onUpdateUnreadCount,
}) => {
  const { user } = useAuth();
  const uid = user?.uid || "local_user";

  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const items = await getNotificationHistory(uid);
      setNotifications(items);
      const unread = items.filter((i) => !i.read).length;
      if (onUpdateUnreadCount) onUpdateUnreadCount(unread);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, uid]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(uid, id);
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
    const unread = notifications.filter((i) => i.id !== id && !i.read).length;
    if (onUpdateUnreadCount) onUpdateUnreadCount(unread);
  };

  const handleClearAll = async () => {
    await clearNotificationHistory(uid);
    setNotifications([]);
    if (onUpdateUnreadCount) onUpdateUnreadCount(0);
  };

  if (!open) return null;

  const renderIcon = (cat?: CustomReminderCategory | string) => {
    switch (cat) {
      case "gym":
        return <Dumbbell className="w-4 h-4 text-orange-500" />;
      case "running":
        return <Footprints className="w-4 h-4 text-emerald-500" />;
      case "water":
        return <Droplet className="w-4 h-4 text-blue-500" />;
      case "task":
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case "habit":
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      default:
        return <Calendar className="w-4 h-4 text-blue-600" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-surface border-l border-border h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="relative p-2 rounded-lg bg-blue-50 text-blue-600">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Notification Center</h2>
              <p className="text-xs text-text-secondary">
                {unreadCount > 0
                  ? `${unreadCount} unread reminder notification${unreadCount === 1 ? "" : "s"}`
                  : "All reminders caught up"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions Bar */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-5 py-2.5 bg-surface-elevated/40 border-b border-border text-xs text-text-secondary">
            <span>{notifications.length} total event{notifications.length === 1 ? "" : "s"}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  for (const n of notifications) {
                    if (!n.read) await markNotificationRead(uid, n.id);
                  }
                  setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
                  if (onUpdateUnreadCount) onUpdateUnreadCount(0);
                }}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 text-text-secondary hover:text-danger font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-xs text-text-secondary">
              Loading reminders...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">No Notifications Yet</h3>
              <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">
                When your scheduled reminders (gym, running, water, or daily tasks) trigger, you will see a record of them here.
              </p>
              <Link
                href="/settings"
                onClick={onClose}
                className="inline-block mt-2 px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                Configure Reminders in Settings
              </Link>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => !item.read && handleMarkRead(item.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  item.read
                    ? "bg-surface border-border opacity-75 hover:opacity-100"
                    : "bg-blue-50/40 border-blue-200/80 shadow-xs"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-surface border border-border shrink-0 mt-0.5">
                    {renderIcon(item.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-text-primary truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-text-secondary whitespace-nowrap">
                        {new Date(item.sentAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                      {item.body}
                    </p>
                    {item.linkUrl && (
                      <Link
                        href={item.linkUrl}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 mt-2"
                      >
                        <span>Open Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
