import { NextResponse } from "next/server";
import { getAdminCandidateEnquiries } from "@/lib/jobs";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const enquiries = await getAdminCandidateEnquiries(token);
    return NextResponse.json({ enquiries });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load candidate enquiries.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
