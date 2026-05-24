import { NextResponse } from "next/server";

function getBaseUrl() {
  return (
    process.env.RAILWAY_API_BASE_URL ||
    process.env.NEXT_PUBLIC_RAILWAY_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/meetings/[roomCode]/ics">
) {
  try {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { message: "Railway API base URL is not configured." },
        { status: 500 }
      );
    }

    const { roomCode } = await context.params;
    const response = await fetch(`${baseUrl}/meetings/${roomCode}/ics`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const result = (await response.json()) as { message?: string };
      return NextResponse.json(
        { message: result.message || "Unable to download calendar file." },
        { status: response.status }
      );
    }

    const calendarFile = await response.text();
    return new Response(calendarFile, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${roomCode}.ics"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to download calendar file.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
