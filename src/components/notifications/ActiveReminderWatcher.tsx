"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { TaskItem } from "@/types";
import { getLocalDateString } from "@/lib/dates";
import { getTasksForDate, toggleTaskStatus } from "@/lib/tasks/taskService";
import { Bell, CheckCircle2, Clock, X, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Plays a loud, pleasant two-tone audio alert using Web Audio API.
 * Works on every modern browser (Chrome, Edge, Safari, iOS, Android) without external audio files.
 */
export function playReminderChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.18);
    gain2.gain.setValueAtTime(0.45, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.65);

    // Tone 3: High E6 (1318.5 Hz) chime
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "triangle";
    osc3.frequency.setValueAtTime(1318.5, now + 0.36);
    gain3.gain.setValueAtTime(0.35, now + 0.36);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.36);
    osc3.stop(now + 0.9);
  } catch (err) {
    console.warn("Web Audio chime could not play:", err);
  }
}

export const ActiveReminderWatcher: React.FC = () => {
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const timeZone = profile?.timeZone || "Asia/Kolkata";

  const [activeAlert, setActiveAlert] = useState<TaskItem | null>(null);
  const alertedIdsRef = useRef<Set<string>>(new Set());

  const triggerAlertForTask = useCallback((task: TaskItem) => {
    // 1. Play audible sound chime
    playReminderChime();

    // 2. Vibrate on supported mobile devices
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([250, 100, 250]);
    }

    // 3. Trigger native OS popup if allowed
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const title = `Task Reminder: ${task.title}`;
      const body = task.description
        ? `${task.description} (Scheduled for ${task.dueTime})`
        : `It's ${task.dueTime} — time for your scheduled task!`;

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            (reg as any).showNotification(title, {
              body,
              icon: "/icons/icon-192.png",
              badge: "/icons/badge-72.png",
              tag: `task-reminder-${task.id}`,
              renotify: true,
              data: { url: "/daily" },
            });
          })
          .catch(() => {
            try {
              new Notification(title, { body, icon: "/icons/icon-192.png" });
            } catch {}
          });
      } else {
        try {
          new Notification(title, { body, icon: "/icons/icon-192.png" });
        } catch {}
      }
    }

    // 4. Show high-priority in-app modal
    setActiveAlert(task);
  }, []);

  useEffect(() => {
    if (!uid) return;

    const checkNow = async () => {
      try {
        const todayStr = getLocalDateString(timeZone);
        const tasks = await getTasksForDate(uid, todayStr);

        // Get local time in HH:mm
        const now = new Date();
        const localTimeStr = new Intl.DateTimeFormat("en-GB", {
          timeZone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(now);

        const [currHour, currMin] = localTimeStr.split(":").map(Number);
        const currentTotalMins = currHour * 60 + currMin;

        for (const task of tasks) {
          if (task.status !== "todo" || !task.dueTime) continue;

          const [taskHour, taskMin = 0] = task.dueTime.split(":").map(Number);
          const taskTotalMins = taskHour * 60 + taskMin;
          const targetAlertMins = taskTotalMins - (task.reminderOffsetMinutes || 0);

          const diffMins = currentTotalMins - targetAlertMins;

          // Alert if current time has reached due time (within a 5-minute window)
          if (diffMins >= 0 && diffMins <= 5) {
            const alertKey = `alerted_${todayStr}_${task.id}_${task.dueTime}`;
            const alreadyAlertedSession = sessionStorage.getItem(alertKey);

            if (!alreadyAlertedSession && !alertedIdsRef.current.has(task.id)) {
              alertedIdsRef.current.add(task.id);
              sessionStorage.setItem(alertKey, "1");
              triggerAlertForTask(task);
              break; // Handle one alert per tick
            }
          }
        }
      } catch (err) {
        console.warn("Error running local reminder watcher:", err);
      }
    };

    // Run check immediately on mount and then every 10 seconds
    checkNow();
    const interval = setInterval(checkNow, 10000);

    return () => clearInterval(interval);
  }, [uid, timeZone, triggerAlertForTask]);

  const handleCompleteTask = async () => {
    if (!activeAlert || !uid) return;
    try {
      await toggleTaskStatus(uid, activeAlert.id, "completed");
    } catch (err) {
      console.warn("Failed to complete task:", err);
    }
    setActiveAlert(null);
  };

  if (!activeAlert) return null;

  return (
    <div className="fixed inset-x-4 top-5 z-[100] max-w-md mx-auto animate-in slide-in-from-top-4 duration-300">
      <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-blue-600 shadow-2xl shadow-blue-600/30 ring-4 ring-blue-500/10 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white animate-bounce">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" />
                Scheduled Task Alert
              </span>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {activeAlert.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveAlert(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeAlert.description && (
          <p className="text-xs text-slate-600 pl-11 line-clamp-2">
            {activeAlert.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Due at {activeAlert.dueTime}</span>
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setActiveAlert(null)}
              className="text-xs py-1"
            >
              Dismiss
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCompleteTask}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              <span>Mark Done</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
