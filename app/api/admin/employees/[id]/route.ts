import { NextResponse } from "next/server";
import { type EmployeeFormPayload, updateEmployee } from "@/lib/crm";

export async function PUT(
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
    const body = (await request.json()) as EmployeeFormPayload;
    const employee = await updateEmployee(id, body, token);
    return NextResponse.json(employee);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update employee on backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
