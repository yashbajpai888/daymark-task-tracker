import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { app, auth, db, isFirebaseConfigured } from "./client";

export const DEFAULT_VAPID_KEY =
  "BE8CCbB66AvbYIkpZ36TvKhTN9K3bl90GyJtTa1efFs4w8AgqjZiqlm2CuhnJc5MjtlPt7J8Da4UPhLvHBnJMjk";

export interface PushSupportInfo {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  isIOS: boolean;
  isStandalone: boolean;
  needsHomeScreenInstall: boolean;
  tokenRegistered?: boolean;
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

// Deterministic fast hash for document ID in browser
export async function computeTokenHash(token: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(token);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
    } catch {
      // Fallback below
    }
  }
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, "0").slice(0, 32);
}

export async function checkPushSupport(): Promise<PushSupportInfo> {
  if (typeof window === "undefined") {
    return {
      supported: false,
      permission: "unsupported",
      isIOS: false,
      isStandalone: false,
      needsHomeScreenInstall: false,
      tokenRegistered: false,
      reason: "Server-side rendering",
    };
  }

  const isIOS = detectDevicePlatform() === "ios";
  const isStandalone = isStandaloneMode();
  const tokenRegistered = Boolean(localStorage.getItem("daymark_fcm_token"));

  if (!("serviceWorker" in navigator)) {
    return {
      supported: false,
      permission: "unsupported",
      isIOS,
      isStandalone,
      needsHomeScreenInstall: false,
      tokenRegistered: false,
      reason: "Service Workers are not supported in this browser.",
    };
  }

  if (!("Notification" in window)) {
    if (isIOS && !isStandalone) {
      return {
        supported: false,
        permission: "unsupported",
        isIOS: true,
        isStandalone: false,
        needsHomeScreenInstall: true,
        tokenRegistered: false,
        reason: "On iOS, Daymark must be added to your Home Screen before Web Push notifications can be enabled.",
      };
    }
    return {
      supported: false,
      permission: "unsupported",
      isIOS,
      isStandalone,
      needsHomeScreenInstall: false,
      tokenRegistered: false,
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
        tokenRegistered: false,
        reason: "To enable push notifications on iOS, tap Share and select 'Add to Home Screen'.",
      };
    }
    return {
      supported: false,
      permission: "unsupported",
      isIOS,
      isStandalone,
      needsHomeScreenInstall: false,
      tokenRegistered: false,
      reason: "Firebase Cloud Messaging is not supported on this browser version.",
    };
  }

  return {
    supported: true,
    permission: Notification.permission,
    isIOS,
    isStandalone,
    needsHomeScreenInstall: false,
    tokenRegistered,
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

    // Call Notification.requestPermission() immediately synchronously on user gesture!
    // iOS Safari strictly requires this without prior awaits.
    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = await new Promise<NotificationPermission>((resolve) => {
        Notification.requestPermission((p) => resolve(p));
      });
    }

    if (permission !== "granted") {
      if (isIOS) {
        return {
          success: false,
          error:
            "Notification permission was denied. Please go to iPhone Settings > Notifications > Daymark and turn on 'Allow Notifications'.",
        };
      }
      return {
        success: false,
        error:
          "Notification permission was not granted. Please click the lock/settings icon next to the browser URL and allow Notifications for this site.",
      };
    }

    const messaging = await getClientMessaging();
    if (!messaging) {
      return { success: false, error: "Firebase Messaging could not be initialized on this browser." };
    }

    // Register or get active service worker registration
    const swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;

    // Use environment variable with safe hardcoded fallback
    const envVapid = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const vapidKey =
      envVapid && envVapid !== "your-public-vapid-key" && envVapid.length > 20
        ? envVapid
        : DEFAULT_VAPID_KEY;

    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration: swRegistration,
      vapidKey,
    });

    if (!currentToken) {
      return { success: false, error: "Unable to retrieve FCM registration token from Google Push Service." };
    }

    // Store token in local storage immediately
    localStorage.setItem("daymark_fcm_token", currentToken);

    const platform = detectDevicePlatform();
    const tokenHash = await computeTokenHash(currentToken);

    // Path 1: Save directly to Firestore via Client SDK if user is authenticated
    if (auth?.currentUser && db) {
      try {
        const uid = auth.currentUser.uid;
        await setDoc(
          doc(db, "users", uid, "fcmTokens", tokenHash),
          {
            token: currentToken,
            platform,
            userAgent: navigator.userAgent,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Update reminderSettings pushEnabled flag
        await setDoc(
          doc(db, "users", uid, "reminderSettings", "main"),
          {
            pushEnabled: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (clientFsErr) {
        console.warn("Client Firestore token save error (will fallback to API route):", clientFsErr);
      }
    }

    // Path 2: Save token via backend API route
    let idToken = typeof tokenOrFn === "function" ? await tokenOrFn() : tokenOrFn;
    if (!idToken && auth?.currentUser) {
      idToken = await auth.currentUser.getIdToken();
    }

    if (idToken) {
      try {
        const apiRes = await fetch("/api/notifications/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            token: currentToken,
            platform,
            userAgent: navigator.userAgent,
          }),
        });

        if (!apiRes.ok) {
          const errData = await apiRes.json().catch(() => ({}));
          console.warn("API route token save returned non-200:", errData);
        }
      } catch (apiErr) {
        console.warn("API route token save network error:", apiErr);
      }
    }

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
      // 1. Remove from client Firestore if authenticated
      if (auth?.currentUser && db) {
        const tokenHash = await computeTokenHash(savedToken);
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "fcmTokens", tokenHash)).catch(() => {});
      }

      // 2. Remove via API
      let effectiveIdToken = idToken;
      if (!effectiveIdToken && auth?.currentUser) {
        effectiveIdToken = await auth.currentUser.getIdToken();
      }

      if (effectiveIdToken) {
        await fetch("/api/notifications/token", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${effectiveIdToken}`,
          },
          body: JSON.stringify({ token: savedToken }),
        }).catch(() => {});
      }

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
