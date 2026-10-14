import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";
import { app, isFirebaseConfigured } from "./client";

export interface PushSupportInfo {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  isIOS: boolean;
  isStandalone: boolean;
  needsHomeScreenInstall: boolean;
  reason?: string;
}

export function detectDevicePlatform(): "android" | "ios" | "desktop" | "other" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  return "desktop";
}

export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export async function checkPushSupport(): Promise<PushSupportInfo> {
  if (typeof window === "undefined") {
    return {
      supported: false,
      permission: "unsupported",
      isIOS: false,
      isStandalone: false,
      needsHomeScreenInstall: false,
      reason: "Server-side rendering",
    };
  }

  const isIOS = detectDevicePlatform() === "ios";
  const isStandalone = isStandaloneMode();

  if (!("serviceWorker" in navigator)) {
    return {
      supported: false,
      permission: "unsupported",
      isIOS,
      isStandalone,
      needsHomeScreenInstall: false,
      reason: "Service Workers are not supported in this browser.",
    };
  }

  if (!("Notification" in window)) {
    // On iOS Safari outside standalone mode, Notification API is completely absent
    if (isIOS && !isStandalone) {
      return {
        supported: false,
        permission: "unsupported",
        isIOS: true,
        isStandalone: false,
        needsHomeScreenInstall: true,
        reason: "On iOS, Daymark must be added to your Home Screen before Web Push notifications can be enabled.",
      };
    }
    return {
      supported: false,
      permission: "unsupported",
      isIOS,
      isStandalone,
      needsHomeScreenInstall: false,
      reason: "Push notifications are not supported in this browser.",
    };
  }

  const supportedByFirebase = await isSupported().catch(() => false);
  if (!supportedByFirebase) {
    if (isIOS && !isStandalone) {
      return {
        supported: false,
        permission: "unsupported",
        isIOS: true,
        isStandalone: false,
        needsHomeScreenInstall: true,
        reason: "To enable push notifications on iOS, tap Share and select 'Add to Home Screen'.",
      };
    }
    return {
      supported: false,
      permission: "unsupported",
      isIOS,
      isStandalone,
      needsHomeScreenInstall: false,
      reason: "Firebase Cloud Messaging is not supported on this browser version.",
    };
  }

  return {
    supported: true,
    permission: Notification.permission,
    isIOS,
    isStandalone,
    needsHomeScreenInstall: false,
  };
}

let messagingInstance: Messaging | null = null;

export async function getClientMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined" || !app || !isFirebaseConfigured) return null;
  if (messagingInstance) return messagingInstance;

  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  try {
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.error("Error obtaining client messaging:", err);
    return null;
  }
}

export async function requestAndRegisterPushToken(
  tokenOrFn?: string | null | (() => Promise<string | null>)
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    if (typeof window === "undefined") {
      return { success: false, error: "Server-side environment." };
    }

    const isIOS = detectDevicePlatform() === "ios";
    const isStandalone = isStandaloneMode();

    if (!("Notification" in window)) {
      if (isIOS && !isStandalone) {
        return {
          success: false,
          error:
            "On iPhone, please tap Share -> 'Add to Home Screen', then launch Daymark from your Home Screen to enable notifications.",
        };
      }
      return {
        success: false,
        error: "Notification API is not available on this device/browser.",
      };
    }

    // Call Notification.requestPermission() immediately synchronously on user click!
    // iOS Safari strictly requires this without prior awaits, or it ignores the gesture.
    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch {
      // Fallback for older WebKit callback style
      permission = await new Promise<NotificationPermission>((resolve) => {
        Notification.requestPermission((p) => resolve(p));
      });
    }

    if (permission !== "granted") {
      return {
        success: false,
        error:
          "Notification permission was denied. Please go to iPhone Settings > Notifications > Daymark and turn on 'Allow Notifications'.",
      };
    }

    const messaging = await getClientMessaging();
    if (!messaging) {
      return { success: false, error: "Firebase Messaging could not be initialized." };
    }

    // Register or get active service worker registration
    const swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration: swRegistration,
      vapidKey: vapidKey && vapidKey !== "your-public-vapid-key" ? vapidKey : undefined,
    });

    if (!currentToken) {
      return { success: false, error: "Unable to retrieve FCM registration token." };
    }

    // Resolve auth token now that permission has been granted
    const idToken = typeof tokenOrFn === "function" ? await tokenOrFn() : tokenOrFn;

    // Save token to backend API
    const platform = detectDevicePlatform();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (idToken) {
      headers["Authorization"] = `Bearer ${idToken}`;
    }

    await fetch("/api/notifications/token", {
      method: "POST",
      headers,
      body: JSON.stringify({
        token: currentToken,
        platform,
        userAgent: navigator.userAgent,
      }),
    });

    // Store token in local storage for quick lookup & logout cleanup
    localStorage.setItem("daymark_fcm_token", currentToken);

    return { success: true, token: currentToken };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error enabling push notifications";
    console.error("requestAndRegisterPushToken error:", err);
    return { success: false, error: msg };
  }
}

export async function unsubscribePushToken(idToken?: string | null): Promise<void> {
  try {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("daymark_fcm_token") : null;
    if (savedToken) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }

      await fetch("/api/notifications/token", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ token: savedToken }),
      });
      localStorage.removeItem("daymark_fcm_token");
    }
  } catch (err) {
    console.warn("Error unsubscribing push token:", err);
  }
}

export function subscribeForegroundMessages(
  onReceive: (payload: { title: string; body: string; data?: Record<string, string> }) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribe: (() => void) | undefined;
  getClientMessaging().then((messaging) => {
    if (!messaging) return;
    unsubscribe = onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title || "Daymark Reminder";
      const body = payload.notification?.body || payload.data?.body || "";
      onReceive({ title, body, data: payload.data });
    });
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}
