"use client";

import React from "react";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ServiceWorkerRegister />
      {children}
    </AuthProvider>
  );
}
