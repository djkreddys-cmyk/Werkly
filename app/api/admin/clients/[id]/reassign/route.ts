import { NextResponse, type NextRequest } from "next/server";
import { reassignClient } from "@/lib/crm";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as { assignedEmployeeId: string };
    const { id } = await context.params;
    const client = await reassignClient(id, body, token);
    return NextResponse.json(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reassign client.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
