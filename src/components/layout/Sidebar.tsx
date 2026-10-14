"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Briefcase,
  Flame,
  BarChart3,
  Settings,
  LogOut,
  FolderPlus,
  Tag,
  Bell,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Category } from "@/types";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { getNotificationHistory } from "@/lib/reminders/customReminderService";

interface SidebarProps {
  categories?: Category[];
  onAddCategory?: () => void;
  activeCategorySlug?: string;
  onSelectCategory?: (slug: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  categories = [],
  onAddCategory,
  activeCategorySlug,
  onSelectCategory,
}) => {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const uid = user?.uid || "local_user";
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getNotificationHistory(uid, 10).then((history) => {
      setUnreadCount(history.filter((h) => !h.read).length);
    });
  }, [uid]);

  const navItems = [
    { label: "Home", href: "/", icon: LayoutDashboard },
    { label: "Daily", href: "/daily", icon: CalendarCheck },
    { label: "Work", href: "/work", icon: Briefcase },
    { label: "Habits", href: "/habits", icon: Flame },
    { label: "Reports", href: "/reports", icon: BarChart3 },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const customCategories = categories.filter((c) => c.kind === "custom" && !c.isArchived);

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-surface shrink-0 h-screen sticky top-0 select-none">
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs">
              <div className="w-3.5 h-3.5 rounded-sm bg-white" />
            </div>
            <span className="font-bold text-base text-text-primary tracking-tight">
              Daymark
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setNotifCenterOpen(true)}
              className="relative p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
              title="Notification Center"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute 0 top-0.5 right-0.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-surface" />
              )}
            </button>
            <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              PRO
            </span>
          </div>
        </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-6">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold border border-blue-100 shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-blue-600" : "text-text-secondary"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Custom Tabs / Categories Group */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              Categories
            </span>
            {onAddCategory && (
              <button
                type="button"
                onClick={onAddCategory}
                className="text-text-secondary hover:text-accent p-1 rounded hover:bg-surface-elevated transition-colors"
                title="Add Category"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-0.5">
            {customCategories.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-secondary/60 italic">
                No custom categories
              </div>
            ) : (
              customCategories.map((cat) => {
                const isSelected = activeCategorySlug === cat.slug;
                return (
                  <button
                    key={cat.id || cat.slug}
                    type="button"
                    onClick={() => onSelectCategory && onSelectCategory(cat.slug)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-50 text-blue-700 font-semibold border border-blue-100 shadow-xs"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Tag className="w-3 h-3 text-text-secondary shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Profile / Account Footer */}
      <div className="p-3 border-t border-border bg-surface">
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated/60 border border-border">
            <div className="flex flex-col truncate pr-2">
              <span className="text-xs font-semibold text-text-primary truncate">
                {profile?.displayName || user.displayName || user.email || "User"}
              </span>
              <span className="text-[10px] text-text-secondary truncate">
                {user.email || profile?.timeZone || "Active Session"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="p-1.5 text-text-secondary hover:text-danger rounded-md hover:bg-slate-100 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100/80 border border-blue-200/80 text-xs font-semibold transition-colors"
          >
            <span>Sign In / Create Account</span>
          </Link>
        )}
      </div>
    </aside>

    <NotificationCenter
      open={notifCenterOpen}
      onClose={() => setNotifCenterOpen(false)}
      onUpdateUnreadCount={(c) => setUnreadCount(c)}
    />
  </>
);
};
