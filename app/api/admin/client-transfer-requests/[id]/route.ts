import { NextResponse } from "next/server";
import {
  reviewClientTransferRequest,
  type ClientTransferReviewPayload,
} from "@/lib/crm";

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
    const payload = (await request.json()) as ClientTransferReviewPayload;
    const reviewed = await reviewClientTransferRequest(id, payload, token);
    return NextResponse.json(reviewed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to review client transfer request.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
