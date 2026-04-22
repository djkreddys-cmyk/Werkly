import { NextResponse } from "next/server";
import { requestForgotPasswordOtp } from "@/lib/jobs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      identifier?: string;
      dateOfBirth?: string;
    };

    if (!body.identifier || !body.dateOfBirth) {
      return NextResponse.json(
        { message: "Employee ID and date of birth are required." },
        { status: 400 }
      );
    }

    const result = await requestForgotPasswordOtp(body.identifier, body.dateOfBirth);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to request password reset OTP.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
