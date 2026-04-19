import { NextResponse } from "next/server";
import { resetEmployeePassword } from "@/lib/crm";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      password: string;
      mustChangePassword?: boolean;
    };
    const employee = await resetEmployeePassword(id, body, token);
    return NextResponse.json(employee);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reset employee password.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
