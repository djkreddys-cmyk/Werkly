import { NextResponse } from "next/server";
import { deleteSavedView, getSavedViews, saveCurrentView, type SavedViewRecord } from "@/lib/workflow";

const savedViewRetentionMs = 2 * 24 * 60 * 60 * 1000;

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim();
}

function getSavedViewTimestamp(view: SavedViewRecord) {
  const value = view.updatedAt || view.createdAt;
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isRetainedSavedView(view: SavedViewRecord) {
  const timestamp = getSavedViewTimestamp(view);
  if (timestamp === null) {
    return true;
  }

  return Date.now() - timestamp <= savedViewRetentionMs;
}

async function cleanupExpiredSavedViews(token: string) {
  const visibleViews = await getSavedViews(token, { scope: "all" });
  const expiredViews = visibleViews.filter((view) => !isRetainedSavedView(view));

  if (expiredViews.length === 0) {
    return 0;
  }

  const results = await Promise.allSettled(
    expiredViews.map((view) => deleteSavedView(view.id, token))
  );
  return results.filter((result) => result.status === "fulfilled").length;
}

export async function GET(request: Request) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const removedCount = await cleanupExpiredSavedViews(token);
    const views = await getSavedViews(token, {
      moduleKey: searchParams.get("moduleKey") || undefined,
      scope: (searchParams.get("scope") as "mine" | "all" | null) || undefined,
    });
    return NextResponse.json({ views: views.filter(isRetainedSavedView), removedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load saved views.";
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
    const view = await saveCurrentView(payload, token);
    await cleanupExpiredSavedViews(token);
    return NextResponse.json(view, { status: payload?.id ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save current view.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
