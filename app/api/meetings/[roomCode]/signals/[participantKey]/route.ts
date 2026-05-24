import { NextResponse } from "next/server";

function getBaseUrl() {
  return (
    process.env.RAILWAY_API_BASE_URL ||
    process.env.NEXT_PUBLIC_RAILWAY_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/meetings/[roomCode]/signals/[participantKey]">
) {
  try {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { message: "Railway API base URL is not configured." },
        { status: 500 }
      );
    }

    const { roomCode, participantKey } = await context.params;
    const url = new URL(request.url);
    const since = url.searchParams.get("since") || "0";
    const response = await fetch(
      `${baseUrl}/meetings/${roomCode}/signals/${participantKey}?since=${encodeURIComponent(since)}`,
      {
        cache: "no-store",
      }
    );
    const result = (await response.json()) as { message?: string };

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load meeting signals.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
