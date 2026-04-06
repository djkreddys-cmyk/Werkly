import { NextResponse, type NextRequest } from "next/server";
import { createEmployee, getEmployees, type EmployeeFormPayload } from "@/lib/crm";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const employees = await getEmployees(token);
    return NextResponse.json({ employees });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load employees from backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as EmployeeFormPayload;
    const employee = await createEmployee(body, token);
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create employee on backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
