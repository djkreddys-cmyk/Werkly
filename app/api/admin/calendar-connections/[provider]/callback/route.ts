import { NextResponse } from "next/server";
import { connectCalendarProvider, type CalendarProvider } from "@/lib/crm";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim() || "";
}

function isCalendarProvider(value: string): value is CalendarProvider {
  return value === "google" || value === "microsoft";
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/calendar-connections/[provider]/callback">
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

    const body = (await request.json()) as { code?: string; redirectUri?: string };
    if (!body.code || !body.redirectUri) {
      return NextResponse.json(
        { message: "Calendar code and redirect URI are required." },
        { status: 400 }
      );
    }

    const connection = await connectCalendarProvider(
      provider,
      body.code,
      body.redirectUri,
      token
    );
    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to connect calendar.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
