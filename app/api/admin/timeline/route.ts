import { NextResponse } from "next/server";
import { getTimelineEvents } from "@/lib/workflow";

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeline = await getTimelineEvents(token, {
      entityType: searchParams.get("entityType") || undefined,
      entityId: searchParams.get("entityId") || undefined,
      actorId: searchParams.get("actorId") || undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    });
    return NextResponse.json({ timeline });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load timeline.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
