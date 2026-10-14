import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    if (!isAdminConfigured || !adminAuth || !adminDb) {
      return NextResponse.json(
        { error: "Server Admin SDK not configured for export" },
        { status: 503 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const tasksSnap = await adminDb.collection("users").doc(uid).collection("tasks").get();
    const tplSnap = await adminDb.collection("users").doc(uid).collection("taskTemplates").get();
    const catSnap = await adminDb.collection("users").doc(uid).collection("categories").get();
    const settingsSnap = await adminDb.collection("users").doc(uid).collection("settings").get();

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: userDoc.data() || {},
      settings: settingsSnap.docs.map((d) => d.data()),
      categories: catSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      templates: tplSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      tasks: tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="daymark-export-${uid}-${Date.now()}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
