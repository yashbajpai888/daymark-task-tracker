import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { pushTokenSchema } from "@/lib/validation/schemas";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing authentication token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!isAdminConfigured || !adminAuth || !adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin is not configured on the server." },
        { status: 503 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const body = await req.json();
    const parsed = pushTokenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid push token payload" },
        { status: 400 }
      );
    }

    const { token, platform, userAgent } = parsed.data;

    // Use SHA-256 hash of token as deterministic document ID
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex").slice(0, 32);
    const tokenRef = adminDb.collection("users").doc(uid).collection("fcmTokens").doc(tokenHash);

    await tokenRef.set(
      {
        token,
        platform: platform || "desktop",
        userAgent: userAgent || "",
        updatedAt: new Date(),
        createdAt: new Date(),
      },
      { merge: true }
    );

    // Also update reminderSettings to reflect pushEnabled: true
    await adminDb
      .collection("users")
      .doc(uid)
      .collection("reminderSettings")
      .doc("main")
      .set(
        {
          pushEnabled: true,
          updatedAt: new Date(),
        },
        { merge: true }
      );

    return NextResponse.json({ success: true, message: "Push token registered successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error registering push token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!isAdminConfigured || !adminAuth || !adminDb) {
      return NextResponse.json({ success: true });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const body = await req.json().catch(() => ({}));
    const token = body.token;

    if (token) {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex").slice(0, 32);
      await adminDb.collection("users").doc(uid).collection("fcmTokens").doc(tokenHash).delete();
    }

    return NextResponse.json({ success: true, message: "Push token removed successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error removing push token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
