import { NextResponse } from "next/server";
import { createApprovalRequest, getApprovalRequests } from "@/lib/workflow";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim();
}

export async function GET(request: Request) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const approvals = await getApprovalRequests(token, {
      status: searchParams.get("status") || undefined,
      requestType: searchParams.get("requestType") || undefined,
      entityType: searchParams.get("entityType") || undefined,
    });
    return NextResponse.json({ approvals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load approvals.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const payload = await request.json();
    const approval = await createApprovalRequest(payload, token);
    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create approval request.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
