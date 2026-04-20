import { NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/crm";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const notification = await markNotificationRead(id, token);
    if (!notification) {
      return NextResponse.json({ message: "Notification not found." }, { status: 404 });
    }
    return NextResponse.json(notification);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update notification.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
