import { NextResponse } from "next/server";

function getBaseUrl() {
  return (
    process.env.RAILWAY_API_BASE_URL ||
    process.env.NEXT_PUBLIC_RAILWAY_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/meetings/[roomCode]/participants/[participantKey]">
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
    const response = await fetch(
      `${baseUrl}/meetings/${roomCode}/participants/${participantKey}`,
      {
        method: "DELETE",
        cache: "no-store",
      }
    );
    const result = (await response.json()) as { message?: string };

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to leave meeting.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
