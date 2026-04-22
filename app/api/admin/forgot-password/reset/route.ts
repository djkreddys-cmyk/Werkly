import { NextResponse } from "next/server";
import { resetForgotPassword } from "@/lib/jobs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      resetToken?: string;
      newPassword?: string;
    };

    if (!body.resetToken || !body.newPassword) {
      return NextResponse.json(
        { message: "Reset token and new password are required." },
        { status: 400 }
      );
    }

    const result = await resetForgotPassword(body.resetToken, body.newPassword);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reset password.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
