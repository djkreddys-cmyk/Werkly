import { NextResponse } from "next/server";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim();
}

export async function POST(request: Request) {
  try {
    const token = getToken(request);
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

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/admin/workflows/run-sla`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const result = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { message: result?.message || "Unable to run reminder workflow." },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run reminder workflow.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
