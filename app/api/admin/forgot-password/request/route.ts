import { NextResponse } from "next/server";

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

    const baseUrl =
      process.env.RAILWAY_API_BASE_URL || process.env.NEXT_PUBLIC_RAILWAY_API_BASE_URL || "";
    if (!baseUrl) {
      return NextResponse.json(
        { message: "Railway API base URL is not configured." },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/auth/forgot-password/request`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to request password reset OTP.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
