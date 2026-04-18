import { NextResponse } from "next/server";
import { adminLogin } from "@/lib/jobs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      identifier?: string;
      email?: string;
      password?: string;
    };
    const identifier = body.identifier ?? body.email;

    if (!identifier || !body.password) {
      return NextResponse.json(
        { message: "Employee code or admin email, and password are required." },
        { status: 400 }
      );
    }

    const result = await adminLogin(identifier, body.password);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to log in to Railway backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
