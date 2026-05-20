import { NextResponse, type NextRequest } from "next/server";
import { deleteClient, getClientById, updateClient, type ClientFormPayload } from "@/lib/crm";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const client = await getClientById(id, token);
    return NextResponse.json(client);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load client details from backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await deleteClient(id, token);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete client from backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as ClientFormPayload;
    const client = await updateClient(id, body, token);
    return NextResponse.json(client);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update client from backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
