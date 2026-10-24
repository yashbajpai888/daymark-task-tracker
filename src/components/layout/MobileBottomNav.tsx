"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Briefcase,
  Flame,
  MoreHorizontal,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);

  const mainTabs = [
    { label: "Home", href: "/", icon: LayoutDashboard },
    { label: "Daily", href: "/daily", icon: CalendarCheck },
    { label: "Work", href: "/work", icon: Briefcase },
    { label: "Habits", href: "/habits", icon: Flame },
  ];

  const isMoreActive = pathname.startsWith("/reports") || pathname.startsWith("/settings");

  return (
    <>
      {/* "More" Drawer for Mobile */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMoreOpen(false)}
          />
          <div className="relative bg-surface border-t border-border rounded-t-2xl p-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] space-y-3 z-10 shadow-2xl max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-sm font-semibold text-text-primary">More Actions</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setNotifCenterOpen(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-text-primary hover:bg-surface-elevated active:bg-surface-elevated text-left min-h-[44px]"
            >
              <Bell className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Notification Center</span>
            </button>

            <Link
              href="/reports"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-text-primary hover:bg-surface-elevated active:bg-surface-elevated min-h-[44px]"
            >
              <BarChart3 className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Reports & Analytics</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-text-primary hover:bg-surface-elevated active:bg-surface-elevated min-h-[44px]"
            >
              <Settings className="w-5 h-5 text-text-secondary shrink-0" />
              <span>Settings & Reminders</span>
            </Link>

            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 active:bg-danger/15 text-left min-h-[44px]"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="truncate">Sign Out ({user.displayName || user.email})</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-center p-3 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 min-h-[44px]"
              >
                <span>Sign In / Create Account</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur border-t border-border safe-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors active:scale-95 ${
                  isActive ? "text-accent" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[11px] font-medium mt-1">{tab.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors active:scale-95 ${
              isMoreActive ? "text-accent" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <MoreHorizontal className="w-5 h-5 shrink-0" />
            <span className="text-[11px] font-medium mt-1">More</span>
          </button>
        </div>
      </nav>

      <NotificationCenter
        open={notifCenterOpen}
        onClose={() => setNotifCenterOpen(false)}
      />
    </>
  );
};
