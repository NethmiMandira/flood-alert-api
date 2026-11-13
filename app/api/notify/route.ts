import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminMessaging } from "@/lib/firebaseAdmin";



// Must match NotificationService.topicFor() in the Flutter app:
// "Nuwara Eliya" -> "district_nuwara_eliya"
function topicFor(district: string) {
  return `district_${district.toLowerCase().replace(/ /g, "_")}`;
}

const SEVERITY_EMOJI: Record<string, string> = {
  yellow: "🟡",
  orange: "🟠",
  red: "🔴",
};

const TYPE_LABEL: Record<string, string> = {
  flood: "Flood / ගංවතුර",
  landslide: "Landslide / නායයෑම්",
  roadBlocked: "Road blocked / මාර්ගය අවහිරයි",
};

export async function POST(req: NextRequest) {
  // 1. Verify who is calling, using the Firebase ID token from the app
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!idToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 2. Read the report id from the request body
  const body = await req.json().catch(() => null);
  const reportId = body?.reportId;
  if (typeof reportId !== "string" || reportId.length === 0) {
    return NextResponse.json({ error: "reportId required" }, { status: 400 });
  }

  // 3. Load the report from Firestore
  const ref = adminDb.collection("reports").doc(reportId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  const report = snap.data()!;

  // Only the person who created the report can trigger its notification
  if (report.userId !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Never notify twice for the same report
  if (report.notified === true) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // 4. Build and send the notification to the district topic
  const emoji = SEVERITY_EMOJI[report.severity] ?? "⚠️";
  const typeLabel = TYPE_LABEL[report.type] ?? "Incident";
  const description = String(report.description ?? "");

  await adminMessaging.send({
    topic: topicFor(String(report.district)),
    notification: {
      title: `${emoji} ${typeLabel} - ${report.district}`,
      body:
        description.length > 100
          ? `${description.slice(0, 100)}...`
          : description,
    },
    data: {
      reportId,
      type: String(report.type),
      severity: String(report.severity),
    },
    android: { priority: "high" },
  });

  // 5. Mark as notified so a retry does not send it again
  await ref.update({ notified: true });

  return NextResponse.json({ ok: true });
}