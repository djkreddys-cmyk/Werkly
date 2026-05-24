import { NextResponse } from "next/server";
import { getCalendarConnections } from "@/lib/crm";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim() || "";
}

export async function GET(request: Request) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const result = await getCalendarConnections(token);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load calendar connections.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
