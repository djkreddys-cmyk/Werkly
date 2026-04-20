import { NextResponse, type NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const baseUrl =
      process.env.RAILWAY_API_BASE_URL || process.env.NEXT_PUBLIC_RAILWAY_API_BASE_URL || "";
    if (!baseUrl) {
      return NextResponse.json(
        { message: "Railway API base URL is not configured." },
        { status: 500 }
      );
    }

    const { id } = await context.params;
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/admin/clients/${id}/activity`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : { activity: [] };

    if (!response.ok) {
      return NextResponse.json(
        { message: payload.message || "Unable to load client activity." },
        { status: response.status }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load client activity.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
