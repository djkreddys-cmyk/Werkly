import { NextResponse } from "next/server";
import { disconnectCalendarProvider, type CalendarProvider } from "@/lib/crm";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim() || "";
}

function isCalendarProvider(value: string): value is CalendarProvider {
  return value === "google" || value === "microsoft";
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/admin/calendar-connections/[provider]">
) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { provider } = await context.params;
    if (!isCalendarProvider(provider)) {
      return NextResponse.json({ message: "Calendar provider is not supported." }, { status: 400 });
    }

    const result = await disconnectCalendarProvider(provider, token);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to disconnect calendar.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
