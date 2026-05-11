import { NextResponse } from "next/server";
import { createAttendanceException, getAttendanceExceptions } from "@/lib/leave";

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const exceptions = await getAttendanceExceptions(token);
    return NextResponse.json({ exceptions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load attendance exceptions.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const exception = await createAttendanceException(await request.json(), token);
    return NextResponse.json(exception, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save attendance exception.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
