"use client";

import React from "react";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
import { ActiveReminderWatcher } from "@/components/notifications/ActiveReminderWatcher";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ServiceWorkerRegister />
      <ActiveReminderWatcher />
      {children}
    </AuthProvider>
  );
}
