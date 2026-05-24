"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { InternalMeetingRecord } from "@/lib/crm";

function formatMeetingDate(value?: string | null) {
  if (!value) {
    return "Open room";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InternalMeetingRoom({ roomCode }: { roomCode: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [meeting, setMeeting] = useState<InternalMeetingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy link");

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setError("Please log in to Werkly CRM before joining this internal meeting.");
      return;
    }

    fetch(`/api/admin/meetings/${roomCode}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const result = (await response.json()) as InternalMeetingRecord & { message?: string };
        if (!response.ok) {
          throw new Error(result.message || "Unable to load meeting.");
        }
        setMeeting(result);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load meeting.");
      })
      .finally(() => setIsLoading(false));
  }, [roomCode, token]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraEnabled]);

  async function startPreview() {
    setMediaError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraEnabled(true);
      setMicEnabled(true);
    } catch (previewError) {
      setMediaError(
        previewError instanceof Error
          ? previewError.message
          : "Camera or microphone permission was blocked."
      );
    }
  }

  function toggleCamera() {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!videoTrack) {
      void startPreview();
      return;
    }

    videoTrack.enabled = !videoTrack.enabled;
    setCameraEnabled(videoTrack.enabled);
  }

  function toggleMic() {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (!audioTrack) {
      void startPreview();
      return;
    }

    audioTrack.enabled = !audioTrack.enabled;
    setMicEnabled(audioTrack.enabled);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy link"), 1600);
  }

  return (
    <main className="min-h-screen bg-[#eef3f6]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 py-3">
          <Link
            href="/admin/meetings"
            className="text-sm font-semibold text-[var(--color-dark)] transition hover:text-[#064d56]"
          >
            Werkly Team Meetings
          </Link>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
          >
            {copyLabel}
          </button>
        </header>

        <section className="grid flex-1 gap-5 py-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl bg-[#10262b] shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
            <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(241,166,75,0.22),transparent_30%),linear-gradient(135deg,#10262b,#061417)] p-4">
              {cameraEnabled ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full max-h-[72vh] w-full rounded-xl object-cover"
                />
              ) : (
                <div className="text-center text-white">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-semibold">
                    WK
                  </div>
                  <h1 className="mt-5 text-2xl font-semibold">
                    {meeting?.title || "Internal meeting room"}
                  </h1>
                  <p className="mt-2 text-sm text-white/72">
                    Start your camera and microphone when you are ready.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-[#0b1e22] px-4 py-4">
              <button
                type="button"
                onClick={toggleMic}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  micEnabled
                    ? "bg-white text-[#0b1e22]"
                    : "bg-white/10 text-white hover:bg-white/16"
                }`}
              >
                {micEnabled ? "Mic on" : "Mic off"}
              </button>
              <button
                type="button"
                onClick={toggleCamera}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  cameraEnabled
                    ? "bg-white text-[#0b1e22]"
                    : "bg-white/10 text-white hover:bg-white/16"
                }`}
              >
                {cameraEnabled ? "Camera on" : "Camera off"}
              </button>
              <button
                type="button"
                onClick={() => {
                  streamRef.current?.getTracks().forEach((track) => track.stop());
                  streamRef.current = null;
                  setCameraEnabled(false);
                  setMicEnabled(false);
                }}
                className="rounded-xl bg-[var(--color-accent-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#9f3914]"
              >
                Leave
              </button>
            </div>
          </div>

          <aside className="crm-panel p-5">
            {isLoading ? (
              <p className="text-sm text-[var(--color-muted)]">Loading room...</p>
            ) : error ? (
              <div>
                <p className="text-sm font-semibold text-red-700">{error}</p>
                <Link
                  href="/admin/login"
                  className="mt-4 inline-flex rounded-xl bg-[var(--color-dark)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Go to login
                </Link>
              </div>
            ) : (
              <div>
                <p className="eyebrow">Room</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{meeting?.title}</h2>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {formatMeetingDate(meeting?.startsAt)}
                </p>
                {meeting?.description ? (
                  <p className="mt-4 rounded-xl bg-[rgba(8,96,108,0.06)] p-3 text-sm text-slate-700">
                    {meeting.description}
                  </p>
                ) : null}
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-[var(--color-line)] pb-3">
                    <span className="text-[var(--color-muted)]">Room code</span>
                    <span className="font-semibold text-slate-900">{roomCode}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[var(--color-line)] pb-3">
                    <span className="text-[var(--color-muted)]">Created by</span>
                    <span className="text-right font-semibold text-slate-900">
                      {meeting?.createdByName || "Werkly User"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[var(--color-muted)]">Invited</span>
                    <span className="font-semibold text-slate-900">
                      {meeting?.participantEmployeeIds.length || 0}
                    </span>
                  </div>
                </div>
                {mediaError ? (
                  <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                    {mediaError}
                  </p>
                ) : null}
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
