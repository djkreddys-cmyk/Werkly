import { NextResponse } from "next/server";
import { getAttendance } from "@/lib/attendance";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const attendance = await getAttendance(token);
    return NextResponse.json({ attendance });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load attendance records.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
