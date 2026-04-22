import { NextResponse } from "next/server";
import { deleteSavedView } from "@/lib/workflow";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await deleteSavedView(id, token);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete saved view.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
