import { NextResponse } from "next/server";
import {
  createNotificationLog,
  getNotificationLogs,
  type NotificationLogRecord,
} from "@/lib/crm";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const notifications = await getNotificationLogs(token);
    return NextResponse.json({ notifications });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load notifications.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const payload = (await request.json()) as Omit<
      NotificationLogRecord,
      "id" | "createdAt" | "isRead"
    > & { isRead?: boolean };

    const created = await createNotificationLog(payload, token);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create notification.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
