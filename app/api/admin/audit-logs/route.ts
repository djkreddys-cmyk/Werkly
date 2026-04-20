import { NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/crm";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const logs = await getAuditLogs(token, {
      entityType: searchParams.get("entityType") || undefined,
      entityId: searchParams.get("entityId") || undefined,
      actorId: searchParams.get("actorId") || undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load audit logs.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
