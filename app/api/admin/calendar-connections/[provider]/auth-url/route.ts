import { NextResponse } from "next/server";
import { getCalendarAuthUrl, type CalendarProvider } from "@/lib/crm";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim() || "";
}

function isCalendarProvider(value: string): value is CalendarProvider {
  return value === "google" || value === "microsoft";
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/admin/calendar-connections/[provider]/auth-url">
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

    const redirectUri = new URL(request.url).searchParams.get("redirectUri") || "";
    if (!redirectUri) {
      return NextResponse.json({ message: "Calendar redirect URI is required." }, { status: 400 });
    }

    const result = await getCalendarAuthUrl(provider, redirectUri, token);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start calendar sync.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
