import { NextResponse } from "next/server";
import { createHoliday, getHolidays } from "@/lib/leave";

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const holidays = await getHolidays(token);
    return NextResponse.json({ holidays });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load holidays.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const holiday = await createHoliday(await request.json(), token);
    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save holiday.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
