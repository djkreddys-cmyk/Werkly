import { NextResponse } from "next/server";
import { getAdminApplicationHistory } from "@/lib/jobs";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const history = await getAdminApplicationHistory(token);
    return NextResponse.json({ history });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load application history.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
