import { NextResponse } from "next/server";
import { changeEmployeePassword } from "@/lib/jobs";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Login token is required." }, { status: 401 });
    }

    const body = (await request.json()) as { newPassword?: string };
    if (!body.newPassword) {
      return NextResponse.json(
        { message: "New password is required." },
        { status: 400 }
      );
    }

    const result = await changeEmployeePassword(body.newPassword, token);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to change password on backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
