"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { InternalMeetingParticipant, InternalMeetingRecord } from "@/lib/crm";

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
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [authType] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthType") ?? ""
      : ""
  );
  const [authName] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthName") ?? ""
      : ""
  );
  const [authEmail] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminEmail") ?? ""
      : ""
  );
  const [authEmployeeCode] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyEmployeeCode") ?? ""
      : ""
  );
  const [participantKey] = useState(() => {
    if (typeof window === "undefined") {
      return "server";
    }

    const storageKey = `werklyMeetingParticipant-${roomCode}`;
    const existing = window.localStorage.getItem(storageKey);
    if (existing) {
      return existing;
    }

    const nextKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(storageKey, nextKey);
    return nextKey;
  });
  const [displayName, setDisplayName] = useState(authName || authEmail || "");
  const [meeting, setMeeting] = useState<InternalMeetingRecord | null>(null);
  const [participants, setParticipants] = useState<InternalMeetingParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy link");
  const isHost = Boolean(
    token &&
      meeting &&
      (authType === "admin" ||
        meeting.createdByIdentifier === authEmail ||
        meeting.createdByIdentifier === authEmployeeCode ||
        meeting.createdByName === authName)
  );
  const isMeetingLive = meeting?.status === "live";
  const canJoin = Boolean(isMeetingLive || isHost);

  useEffect(() => {
    setIsLoading(true);
    setError("");

    fetch(
      token ? `/api/admin/meetings/${roomCode}` : `/api/meetings/${roomCode}`,
      token
        ? {
            headers: { Authorization: `Bearer ${token}` },
          }
        : undefined
    )
      .then(async (response) => {
        const result = (await response.json()) as InternalMeetingRecord & { message?: string };
        if (!response.ok) {
          throw new Error(result.message || "Unable to load meeting.");
        }
        setMeeting(result);
        setParticipants(result.participants ?? []);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load meeting.");
      })
      .finally(() => setIsLoading(false));
  }, [roomCode, token]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetch(token ? `/api/admin/meetings/${roomCode}` : `/api/meetings/${roomCode}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
        .then(async (response) => {
          if (!response.ok) {
            return;
          }
          const result = (await response.json()) as InternalMeetingRecord;
          setMeeting(result);
          setParticipants(result.participants ?? []);
        })
        .catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [roomCode, token]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
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
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera and microphone are not available in this browser.");
      }

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
      return true;
    } catch (previewError) {
      setMediaError(
        previewError instanceof Error
          ? previewError.message
          : "Camera or microphone permission was blocked."
      );
      return false;
    }
  }

  async function registerParticipant(
    nextScreenShareState = isScreenSharing,
    nextCameraEnabled = cameraEnabled,
    nextMicEnabled = micEnabled
  ) {
    const safeDisplayName =
      displayName.trim() || authName || authEmail || authEmployeeCode || "Meeting guest";

    const response = await fetch(`/api/meetings/${roomCode}/participants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        participantKey,
        displayName: safeDisplayName,
        isHost,
        cameraEnabled: nextCameraEnabled,
        micEnabled: nextMicEnabled,
        isScreenSharing: nextScreenShareState,
      }),
    });

    if (response.ok) {
      const participant = (await response.json()) as InternalMeetingParticipant;
      setParticipants((current) => [
        participant,
        ...current.filter((item) => item.participantKey !== participant.participantKey),
      ]);
    }
  }

  async function startMeeting() {
    if (!token || !isHost || isStarting) {
      return;
    }

    setIsStarting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/meetings/${roomCode}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "live" }),
      });
      const result = (await response.json()) as InternalMeetingRecord & { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to start meeting.");
      }

      setMeeting(result);
      setParticipants(result.participants ?? participants);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start meeting.");
    } finally {
      setIsStarting(false);
    }
  }

  async function joinMeeting() {
    if (isJoining) {
      return;
    }

    if (!canJoin) {
      setMediaError("The host has not started this meeting yet.");
      return;
    }

    setIsJoining(true);

    try {
      const previewStarted = await startPreview();
      if (previewStarted) {
        setHasJoined(true);
        await registerParticipant(false, true, true);
      }
    } finally {
      setIsJoining(false);
    }
  }

  async function startScreenShare() {
    if (!hasJoined) {
      setMediaError("Join the meeting before sharing your screen.");
      return;
    }

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Screen sharing is not available in this browser.");
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      await registerParticipant(true);
      screenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        void stopScreenShare();
      });
    } catch (shareError) {
      setMediaError(
        shareError instanceof Error ? shareError.message : "Unable to start screen sharing."
      );
    }
  }

  async function stopScreenShare() {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
    await registerParticipant(false);
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
          {token ? (
            <Link
              href="/admin/meetings"
              className="text-sm font-semibold text-[var(--color-dark)] transition hover:text-[#064d56]"
            >
              Werkly Team Meetings
            </Link>
          ) : (
            <span className="text-sm font-semibold text-[var(--color-dark)]">
              Werkly Team Meetings
            </span>
          )}
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
                    {isMeetingLive || isHost
                      ? "Review the join details, then allow camera and microphone."
                      : "Waiting for the host to start this meeting."}
                  </p>
                  {isHost && !isMeetingLive ? (
                    <button
                      type="button"
                      onClick={startMeeting}
                      disabled={isStarting}
                      className="mt-5 rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[#0b1e22] transition hover:bg-[#e09a43] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isStarting ? "Starting..." : "Start meeting"}
                    </button>
                  ) : null}
                  {!hasJoined && !error ? (
                    <button
                      type="button"
                      onClick={joinMeeting}
                      disabled={isLoading || isJoining || !canJoin}
                      className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0b1e22] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isJoining
                        ? "Requesting access..."
                        : canJoin
                          ? "Join with camera and mic"
                          : "Waiting for host"}
                    </button>
                  ) : null}
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
                  setHasJoined(false);
                  void fetch(`/api/meetings/${roomCode}/participants/${participantKey}`, {
                    method: "DELETE",
                  });
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
                {token ? null : (
                  <p className="mt-3 text-sm text-[var(--color-muted)]">
                    Please check that the meeting link is correct.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="eyebrow">Join details</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  {meeting?.title || "Internal meeting"}
                </h2>
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
                {!authName && !hasJoined ? (
                  <label className="mt-5 block">
                    <span className="text-sm font-semibold text-slate-800">Your name</span>
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Enter your name"
                      className="mt-2 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-dark)]"
                    />
                  </label>
                ) : null}
                {isHost && !isMeetingLive ? (
                  <button
                    type="button"
                    onClick={startMeeting}
                    disabled={isStarting}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-[#0b1e22] transition hover:bg-[#e09a43] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isStarting ? "Starting meeting..." : "Start meeting as host"}
                  </button>
                ) : null}
                {!hasJoined ? (
                  <button
                    type="button"
                    onClick={joinMeeting}
                    disabled={isJoining || !canJoin}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#064d56] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isJoining
                      ? "Requesting camera and mic..."
                      : canJoin
                        ? "Join with camera and mic"
                        : "Waiting for host to start"}
                  </button>
                ) : (
                  <div className="mt-5 space-y-3">
                    <p className="rounded-xl bg-[rgba(8,96,108,0.08)] p-3 text-sm font-semibold text-[var(--color-dark)]">
                      You are in the room. Camera and microphone controls are below the preview.
                    </p>
                    <button
                      type="button"
                      onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
                    >
                      {isScreenSharing ? "Stop screen sharing" : "Share screen"}
                    </button>
                  </div>
                )}
                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-950">
                      Joined users
                    </h3>
                    <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--color-dark)]">
                      {participants.length}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {participants.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[var(--color-line)] p-3 text-sm text-[var(--color-muted)]">
                        No one has joined yet.
                      </p>
                    ) : (
                      participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="rounded-xl border border-[var(--color-line)] bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                {participant.displayName}
                              </p>
                              <p className="mt-1 text-xs text-[var(--color-muted)]">
                                {participant.isHost ? "Host" : "Participant"}
                              </p>
                            </div>
                            {participant.isScreenSharing ? (
                              <span className="rounded-full bg-[rgba(241,166,75,0.16)] px-2 py-1 text-[10px] font-semibold text-[var(--color-accent-strong)]">
                                Sharing
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <p className="mt-5 text-xs leading-5 text-[var(--color-muted)]">
                  Screen-share broadcast to every viewer needs the next media layer. This room now captures and marks sharing state; adding WebRTC or LiveKit will make the shared screen visible to everyone.
                </p>
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
