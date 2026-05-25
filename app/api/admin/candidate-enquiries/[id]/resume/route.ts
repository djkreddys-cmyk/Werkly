import { NextResponse } from "next/server";
import { getAdminCandidateEnquiries } from "@/lib/jobs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const enquiries = await getAdminCandidateEnquiries(token);
    const enquiry = enquiries.find((item) => item.id === id);

    if (!enquiry?.resumeFileData || !enquiry.resumeFileName) {
      return NextResponse.json({ message: "Resume is not available." }, { status: 404 });
    }

    return NextResponse.json({
      resumeFileName: enquiry.resumeFileName,
      resumeFileType: enquiry.resumeFileType,
      resumeFileData: enquiry.resumeFileData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load resume.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
