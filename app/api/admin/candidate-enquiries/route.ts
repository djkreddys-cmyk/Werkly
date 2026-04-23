import { NextResponse } from "next/server";
import { createAdminCandidateEnquiry, getAdminCandidateEnquiries } from "@/lib/jobs";

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

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = await request.json();
    const enquiry = await createAdminCandidateEnquiry(body, token);
    return NextResponse.json(enquiry, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save candidate enquiry.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
