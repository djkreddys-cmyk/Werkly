import { NextResponse } from "next/server";

function getBaseUrl() {
  return (
    process.env.RAILWAY_API_BASE_URL ||
    process.env.NEXT_PUBLIC_RAILWAY_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
}

export async function POST(request: Request, context: RouteContext<"/api/meetings/[roomCode]/signals">) {
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
    const response = await fetch(`${baseUrl}/meetings/${roomCode}/signals`, {
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
    const message = error instanceof Error ? error.message : "Unable to send meeting signal.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
