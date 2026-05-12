import { NextResponse } from "next/server";
import { getResumeBuilderSubmissions } from "@/lib/jobs";

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const submissions = await getResumeBuilderSubmissions(token);
    return NextResponse.json({ submissions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load resume builder submissions.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
