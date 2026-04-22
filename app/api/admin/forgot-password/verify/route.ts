import { NextResponse } from "next/server";
import { verifyForgotPasswordOtp } from "@/lib/jobs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      requestId?: string;
      identifier?: string;
      dateOfBirth?: string;
      otp?: string;
    };

    if (!body.requestId || !body.identifier || !body.dateOfBirth || !body.otp) {
      return NextResponse.json(
        { message: "Request, employee ID, DOB, and OTP are required." },
        { status: 400 }
      );
    }

    const result = await verifyForgotPasswordOtp(
      body.requestId,
      body.identifier,
      body.dateOfBirth,
      body.otp
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify OTP.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
