import { NextResponse } from "next/server";
import { getAdminApplications } from "@/lib/jobs";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const applications = await getAdminApplications(token);
    return NextResponse.json({ applications });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load admin applications.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
