import { NextResponse, type NextRequest } from "next/server";
import { createClient, getClients, type ClientFormPayload } from "@/lib/crm";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const clients = await getClients(token);
    return NextResponse.json({ clients });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load clients from backend.";
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

    const body = (await request.json()) as ClientFormPayload;
    const client = await createClient(body, token);
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create client on backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
