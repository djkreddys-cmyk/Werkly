import { NextResponse } from "next/server";

function getBaseUrl() {
  return (
    process.env.RAILWAY_API_BASE_URL ||
    process.env.NEXT_PUBLIC_RAILWAY_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
}

export async function GET(_request: Request, context: RouteContext<"/api/meetings/[roomCode]">) {
  try {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { message: "Railway API base URL is not configured." },
        { status: 500 }
      );
    }

    const { roomCode } = await context.params;
    const response = await fetch(`${baseUrl}/meetings/${roomCode}`, {
      cache: "no-store",
    });
    const result = (await response.json()) as { message?: string };

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load meeting from backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
