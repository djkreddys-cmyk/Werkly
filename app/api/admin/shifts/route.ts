import { NextResponse, type NextRequest } from "next/server";
import { createShift, getShifts } from "@/lib/shifts";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const shifts = await getShifts(token);
    return NextResponse.json({ shifts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load shifts.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as Parameters<typeof createShift>[0];
    const shift = await createShift(body, token);
    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create shift.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
