import { NextRequest, NextResponse } from "next/server";
import { adminAuth, isAdminConfigured } from "@/lib/firebase/admin";
import { sendPushNotificationToUser } from "@/lib/firebase/adminMessaging";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing authentication token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!isAdminConfigured || !adminAuth) {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase Admin is not configured on the server. Please check your service account credentials.",
        },
        { status: 503 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const body = await req.json().catch(() => ({}));
    const title = body.title || "Daymark — Test Notification";
    const messageBody =
      body.body || "Your Web Push notifications and custom reminder delivery are fully operational!";

    const result = await sendPushNotificationToUser(uid, {
      title,
      body: messageBody,
      url: "/daily",
      category: "custom",
      tag: `test-notification-${Date.now()}`,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            result.error ||
            "No active notification devices registered for this account. Please enable push notifications on your device first.",
          tokensAttempted: result.tokensAttempted,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test push notification dispatched to ${result.successCount} active device(s).`,
      tokensAttempted: result.tokensAttempted,
      successCount: result.successCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error sending test push notification";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
