import { NextResponse } from "next/server";
import { adminLogin } from "@/lib/jobs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };

    if (!body.email || !body.password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 }
      );
    }

    const result = await adminLogin(body.email, body.password);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to log in to Railway backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
