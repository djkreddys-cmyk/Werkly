import { NextResponse } from "next/server";

function getBaseUrl() {
  return (
    process.env.RAILWAY_API_BASE_URL ||
    process.env.NEXT_PUBLIC_RAILWAY_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
}

export async function GET(_request: Request, context: RouteContext<"/api/meetings/[roomCode]/participants">) {
  try {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { message: "Railway API base URL is not configured." },
        { status: 500 }
      );
    }

    const { roomCode } = await context.params;
    const response = await fetch(`${baseUrl}/meetings/${roomCode}/participants`, {
      cache: "no-store",
    });
    const result = (await response.json()) as { message?: string };

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load meeting participants.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext<"/api/meetings/[roomCode]/participants">) {
  try {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { message: "Railway API base URL is not configured." },
        { status: 500 }
      );
    }

    const { roomCode } = await context.params;
    const body = await request.json();
    const response = await fetch(`${baseUrl}/meetings/${roomCode}/participants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const result = (await response.json()) as { message?: string };

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to join meeting.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
