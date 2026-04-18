import { NextResponse } from "next/server";
import { adminLogout } from "@/lib/jobs";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Login token is required." }, { status: 401 });
    }

    const body = (await request.json()) as {
      clientTime?: string;
      clientTimezone?: string;
      clientUtcOffsetMinutes?: number;
    };
    const response = await adminLogout(token, {
      clientTime: body.clientTime,
      clientTimezone: body.clientTimezone,
      clientUtcOffsetMinutes: body.clientUtcOffsetMinutes,
    });
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to log out from Railway backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
