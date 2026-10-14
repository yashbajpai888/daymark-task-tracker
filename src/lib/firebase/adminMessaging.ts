import { getMessaging, MulticastMessage, Messaging } from "firebase-admin/messaging";
import { adminApp, adminDb, isAdminConfigured } from "./admin";

let adminMessagingInstance: Messaging | null = null;

function getAdminMessaging(): Messaging | null {
  if (!isAdminConfigured || !adminApp) return null;
  if (!adminMessagingInstance) {
    try {
      adminMessagingInstance = getMessaging(adminApp);
    } catch (err) {
      console.error("Failed to initialize Firebase Admin Messaging:", err);
      return null;
    }
  }
  return adminMessagingInstance;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  category?: string;
  tag?: string;
  data?: Record<string, string>;
}

export interface PushSendResult {
  success: boolean;
  tokensAttempted: number;
  successCount: number;
  failureCount: number;
  error?: string;
}

/**
 * Sends a push notification to all registered FCM tokens for a user.
 * Automatically purges invalid/expired tokens and logs to notificationHistory.
 */
export async function sendPushNotificationToUser(
  uid: string,
  payload: PushPayload
): Promise<PushSendResult> {
  if (!isAdminConfigured || !adminDb) {
    return {
      success: false,
      tokensAttempted: 0,
      successCount: 0,
      failureCount: 0,
      error: "Firebase Admin is not configured on the server.",
    };
  }

  const messaging = getAdminMessaging();
  if (!messaging) {
    return {
      success: false,
      tokensAttempted: 0,
      successCount: 0,
      failureCount: 0,
      error: "Firebase Admin Messaging could not be initialized.",
    };
  }

  try {
    // 1. Fetch user's registered FCM tokens
    const tokensSnap = await adminDb
      .collection("users")
      .doc(uid)
      .collection("fcmTokens")
      .get();

    if (tokensSnap.empty) {
      return {
        success: false,
        tokensAttempted: 0,
        successCount: 0,
        failureCount: 0,
        error: "No registered push notification devices found for this account.",
      };
    }

    const tokenDocs = tokensSnap.docs;
    const tokens = tokenDocs.map((doc) => doc.data().token as string).filter(Boolean);

    if (tokens.length === 0) {
      return {
        success: false,
        tokensAttempted: 0,
        successCount: 0,
        failureCount: 0,
        error: "No valid tokens found.",
      };
    }

    const tag = payload.tag || `daymark-${Date.now()}`;
    const clickUrl = payload.url || "/daily";

    // 2. Prepare WebPush Multicast Message
    const message: MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        title: payload.title,
        body: payload.body,
        url: clickUrl,
        tag,
        category: payload.category || "reminder",
        ...(payload.data || {}),
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: {
          title: payload.title,
          body: payload.body,
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          tag,
          renotify: true,
          requireInteraction: false,
        },
        fcmOptions: {
          link: clickUrl,
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    // 3. Purge invalid or unregistered tokens safely
    const staleDocIds: string[] = [];
    response.responses.forEach((resp, index) => {
      if (!resp.success && resp.error) {
        const errorCode = resp.error.code;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          const docId = tokenDocs[index]?.id;
          if (docId) staleDocIds.push(docId);
        }
      }
    });

    if (staleDocIds.length > 0) {
      const batch = adminDb.batch();
      for (const id of staleDocIds) {
        batch.delete(adminDb.collection("users").doc(uid).collection("fcmTokens").doc(id));
      }
      await batch.commit().catch((err) => console.warn("Failed to cleanup stale tokens:", err));
    }

    // 4. Save to in-app notificationHistory collection
    if (response.successCount > 0) {
      const historyId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await adminDb
        .collection("users")
        .doc(uid)
        .collection("notificationHistory")
        .doc(historyId)
        .set({
          id: historyId,
          title: payload.title,
          body: payload.body,
          category: payload.category || "reminder",
          tag,
          linkUrl: clickUrl,
          sentAt: Date.now(),
          read: false,
        })
        .catch((err) => console.warn("Failed to log notification history:", err));
    }

    return {
      success: response.successCount > 0,
      tokensAttempted: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error sending multicast push message";
    console.error("sendPushNotificationToUser failed:", err);
    return {
      success: false,
      tokensAttempted: 0,
      successCount: 0,
      failureCount: 0,
      error: errorMsg,
    };
  }
}
