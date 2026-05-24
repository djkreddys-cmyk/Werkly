"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  InternalMeetingParticipant,
  InternalMeetingRecord,
  InternalMeetingSignal,
} from "@/lib/crm";

type RemoteMedia = {
  participantKey: string;
  stream: MediaStream;
  mediaType: "camera" | "screen";
};

type MediaStatePayload = {
  streams?: Array<{
    id?: string;
    type?: "camera" | "screen";
  }>;
};

type PeerState = {
  connection: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  mediaTrackIds: Set<string>;
  pendingCandidates: RTCIceCandidateInit[];
  negotiateAgain: boolean;
};

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

function getIceServers(): RTCIceServer[] {
  const fallback = [{ urls: "stun:stun.l.google.com:19302" }];

  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS;
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as RTCIceServer[];
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function streamHasLiveTracks(stream: MediaStream) {
  return stream.getTracks().some((track) => track.readyState === "live");
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "WK";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getTileGridClass(tileCount: number) {
  if (tileCount <= 1) {
    return "grid-cols-1";
  }

  if (tileCount === 2) {
    return "grid-cols-1 md:grid-cols-2";
  }

  if (tileCount <= 4) {
    return "grid-cols-1 sm:grid-cols-2";
  }

  return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";
}

function MeetingTile({
  label,
  media,
  isMuted = false,
  isScreenShare = false,
  showVideo = true,
  compact = false,
  large = false,
  fit = "cover",
}: {
  label: string;
  media?: RemoteMedia | MediaStream;
  isMuted?: boolean;
  isScreenShare?: boolean;
  showVideo?: boolean;
  compact?: boolean;
  large?: boolean;
  fit?: "cover" | "contain";
}) {
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const stream = media instanceof MediaStream ? media : media?.stream;
  const hasVideo = showVideo && Boolean(stream?.getVideoTracks().length);
  const tileHeight = large ? "h-full min-h-[calc(100vh-8rem)]" : compact ? "min-h-32" : "min-h-48";
  const avatarSize = compact ? "h-14 w-14 text-lg" : "h-20 w-20 text-2xl";
  const tileLabel =
    !isScreenShare && !(media instanceof MediaStream) && media?.mediaType === "screen"
      ? `${label} screen`
      : isScreenShare
        ? `${label} screen`
        : label;

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  return (
    <div className={`relative flex overflow-hidden rounded-xl bg-black ${tileHeight}`}>
      {stream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          muted={isMuted}
          playsInline
          className={
            hasVideo
              ? `h-full w-full ${tileHeight} ${fit === "contain" ? "object-contain" : "object-cover"}`
              : "hidden"
          }
        />
      ) : null}
      {!hasVideo ? (
        <div className={`flex flex-1 items-center justify-center bg-[#132f35] ${tileHeight}`}>
          <div className={`flex items-center justify-center rounded-full bg-white/10 font-semibold text-white ${avatarSize}`}>
            {getInitials(label)}
          </div>
        </div>
      ) : null}
      <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
        {tileLabel}
      </span>
    </div>
  );
}

export function InternalMeetingRoom({ roomCode }: { roomCode: string }) {
  const meetingStageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const participantsRef = useRef<InternalMeetingParticipant[]>([]);
  const mediaTypesRef = useRef<Map<string, Map<string, "camera" | "screen">>>(new Map());
  const latestSignalIdRef = useRef(0);
  const hasJoinedRef = useRef(false);
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
  const [isRecording, setIsRecording] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remoteMedia, setRemoteMedia] = useState<RemoteMedia[]>([]);
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
  const hasMeetingEnded = meeting?.status === "ended";
  const canJoin = Boolean((isMeetingLive || isHost) && !hasMeetingEnded);
  const otherParticipants = participants.filter(
    (participant) => participant.participantKey !== participantKey
  );
  const participantMedia = otherParticipants.map((participant) => ({
    participant,
    media: remoteMedia.find(
      (item) => item.participantKey === participant.participantKey && item.mediaType === "camera"
    ),
  }));
  const localScreenShareMedia =
    isScreenSharing && screenStreamRef.current
      ? {
          participantKey,
          stream: screenStreamRef.current,
          mediaType: "screen" as const,
        }
      : null;
  const screenShareMedia = [
    ...(localScreenShareMedia ? [localScreenShareMedia] : []),
    ...remoteMedia.filter((media) => media.mediaType === "screen"),
  ];
  const activeScreenShare = screenShareMedia[0];
  const secondaryScreenShares = screenShareMedia.slice(1);
  const tileCount = 1 + participantMedia.length + screenShareMedia.length;
  const localDisplayName = displayName.trim() || authName || authEmail || "You";

  function getParticipantLabel(media: RemoteMedia) {
    if (media.participantKey === participantKey) {
      return localDisplayName;
    }

    return (
      participants.find((item) => item.participantKey === media.participantKey)?.displayName ||
      "Participant"
    );
  }

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    hasJoinedRef.current = hasJoined;
  }, [hasJoined]);

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
          if (result.status === "ended" && hasJoinedRef.current) {
            setMediaError("The host ended this meeting.");
            leaveMeeting();
          }
        })
        .catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [roomCode, token]);

  useEffect(() => {
    connectToParticipants(participants);
  }, [participants]);

  useEffect(() => {
    if (!hasJoined) {
      return;
    }

    const pollSignals = async () => {
      try {
        const response = await fetch(
          `/api/meetings/${roomCode}/signals/${participantKey}?since=${latestSignalIdRef.current}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as { signals?: InternalMeetingSignal[] };
        for (const signal of result.signals ?? []) {
          latestSignalIdRef.current = Math.max(latestSignalIdRef.current, signal.id);
          await handleSignal(signal);
        }
      } catch (signalError) {
        setMediaError(
          signalError instanceof Error
            ? signalError.message
            : "Meeting signaling failed. Try rejoining the room."
        );
      }
    };

    void pollSignals();
    const interval = window.setInterval(() => {
      void pollSignals();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [hasJoined, participantKey, roomCode]);

  useEffect(() => {
    return () => {
      peersRef.current.forEach((peer) => peer.connection.close());
      peersRef.current.clear();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current?.state === "recording" && mediaRecorderRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraEnabled]);

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === meetingStageRef.current);
    };

    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  function getLocalMediaStreams() {
    return [streamRef.current, screenStreamRef.current].filter(
      (stream): stream is MediaStream => Boolean(stream && streamHasLiveTracks(stream))
    );
  }

  function getLocalMediaState() {
    return {
      streams: [
        streamRef.current
          ? {
              id: streamRef.current.id,
              type: "camera" as const,
            }
          : null,
        screenStreamRef.current
          ? {
              id: screenStreamRef.current.id,
              type: "screen" as const,
            }
          : null,
      ].filter(Boolean),
    };
  }

  function applyRemoteMediaState(
    remoteParticipantKey: string,
    payload: MediaStatePayload
  ) {
    const nextTypes = new Map<string, "camera" | "screen">();
    payload.streams?.forEach((stream) => {
      if (stream.id && (stream.type === "camera" || stream.type === "screen")) {
        nextTypes.set(stream.id, stream.type);
      }
    });
    mediaTypesRef.current.set(remoteParticipantKey, nextTypes);
    setRemoteMedia((current) =>
      current.map((item) =>
        item.participantKey === remoteParticipantKey
          ? {
              ...item,
              mediaType: nextTypes.get(item.stream.id) || item.mediaType,
            }
          : item
      )
    );
  }

  function refreshPeerTracks(peer: PeerState) {
    const streams = getLocalMediaStreams();
    const nextTrackIds = new Set(streams.flatMap((stream) => stream.getTracks().map((track) => track.id)));

    peer.connection.getSenders().forEach((sender) => {
      if (sender.track && !nextTrackIds.has(sender.track.id)) {
        peer.connection.removeTrack(sender);
      }
    });

    streams.forEach((stream) => {
      stream.getTracks().forEach((track) => {
        const exists = peer.connection
          .getSenders()
          .some((sender) => sender.track?.id === track.id);
        if (!exists) {
          peer.connection.addTrack(track, stream);
        }
      });
    });

    peer.mediaTrackIds = nextTrackIds;
  }

  async function sendSignal(
    toParticipantKey: string,
    type: InternalMeetingSignal["type"],
    payload: unknown
  ) {
    await fetch(`/api/meetings/${roomCode}/signals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromParticipantKey: participantKey,
        toParticipantKey,
        type,
        payload,
      }),
    });
  }

  function sendMediaState(toParticipantKey?: string) {
    const recipients = toParticipantKey
      ? [toParticipantKey]
      : participantsRef.current
          .map((participant) => participant.participantKey)
          .filter((key) => key !== participantKey);

    recipients.forEach((recipientKey) => {
      void sendSignal(recipientKey, "media-state", getLocalMediaState());
    });
  }

  function getPeer(remoteParticipantKey: string) {
    const existing = peersRef.current.get(remoteParticipantKey);
    if (existing) {
      refreshPeerTracks(existing);
      return existing;
    }

    const peer: PeerState = {
      connection: new RTCPeerConnection({ iceServers: getIceServers() }),
      makingOffer: false,
      ignoreOffer: false,
      mediaTrackIds: new Set(),
      pendingCandidates: [],
      negotiateAgain: false,
    };

    peer.connection.onicecandidate = (event) => {
      if (event.candidate) {
        void sendSignal(remoteParticipantKey, "candidate", event.candidate.toJSON());
      }
    };

    peer.connection.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteMedia((current) => {
        const next = current.filter((item) => item.stream.id !== stream.id);
        const participantStreams = next.filter(
          (item) => item.participantKey === remoteParticipantKey
        );
        const mediaType =
          mediaTypesRef.current.get(remoteParticipantKey)?.get(stream.id) ||
          (participantStreams.some((item) => item.mediaType === "camera") ||
          participantsRef.current.find(
            (participant) => participant.participantKey === remoteParticipantKey
          )?.isScreenSharing
            ? "screen"
            : "camera");
        return [
          ...next,
          {
            participantKey: remoteParticipantKey,
            stream,
            mediaType,
          },
        ];
      });
    };

    peer.connection.onconnectionstatechange = () => {
      if (["closed", "disconnected", "failed"].includes(peer.connection.connectionState)) {
        setRemoteMedia((current) =>
          current.filter((item) => item.participantKey !== remoteParticipantKey)
        );
      }
    };

    peersRef.current.set(remoteParticipantKey, peer);
    refreshPeerTracks(peer);
    return peer;
  }

  async function negotiateWith(remoteParticipantKey: string) {
    if (!hasJoinedRef.current) {
      return;
    }

    const peer = getPeer(remoteParticipantKey);
    if (peer.makingOffer) {
      peer.negotiateAgain = true;
      return;
    }

    try {
      peer.makingOffer = true;
      do {
        peer.negotiateAgain = false;
        if (peer.connection.signalingState !== "stable") {
          peer.negotiateAgain = true;
          await new Promise((resolve) => window.setTimeout(resolve, 150));
          continue;
        }

        await peer.connection.setLocalDescription();
        if (peer.connection.localDescription) {
          await sendSignal(remoteParticipantKey, "offer", peer.connection.localDescription.toJSON());
          sendMediaState(remoteParticipantKey);
        }
      } while (peer.negotiateAgain);
    } catch (negotiateError) {
      setMediaError(
        negotiateError instanceof Error
          ? negotiateError.message
          : "Unable to update screen sharing for participants."
      );
    } finally {
      peer.makingOffer = false;
      if (peer.negotiateAgain) {
        void negotiateWith(remoteParticipantKey);
      }
    }
  }

  async function handleSignal(signal: InternalMeetingSignal) {
    if (signal.fromParticipantKey === participantKey || !hasJoinedRef.current) {
      return;
    }

    const peer = getPeer(signal.fromParticipantKey);

    if (signal.type === "candidate") {
      const candidate = signal.payload as RTCIceCandidateInit;
      if (!peer.connection.remoteDescription) {
        peer.pendingCandidates.push(candidate);
        return;
      }

      await peer.connection.addIceCandidate(candidate);
      return;
    }

    if (signal.type === "media-state") {
      applyRemoteMediaState(signal.fromParticipantKey, signal.payload as MediaStatePayload);
      return;
    }

    if (signal.type === "mute-audio") {
      forceMuteMic();
      return;
    }

    const description = signal.payload as RTCSessionDescriptionInit;
    const offerCollision =
      description.type === "offer" &&
      (peer.makingOffer || peer.connection.signalingState !== "stable");
    const isPolite = participantKey > signal.fromParticipantKey;
    peer.ignoreOffer = !isPolite && offerCollision;

    if (peer.ignoreOffer) {
      return;
    }

    await peer.connection.setRemoteDescription(description);
    const queuedCandidates = peer.pendingCandidates.splice(0);
    await Promise.all(
      queuedCandidates.map((candidate) => peer.connection.addIceCandidate(candidate))
    );

    if (description.type === "offer") {
      refreshPeerTracks(peer);
      await peer.connection.setLocalDescription();
      if (peer.connection.localDescription) {
        await sendSignal(signal.fromParticipantKey, "answer", peer.connection.localDescription.toJSON());
        sendMediaState(signal.fromParticipantKey);
      }
    }
  }

  function removePeer(remoteParticipantKey: string) {
    const peer = peersRef.current.get(remoteParticipantKey);
    peer?.connection.close();
    peersRef.current.delete(remoteParticipantKey);
    setRemoteMedia((current) => current.filter((item) => item.participantKey !== remoteParticipantKey));
  }

  function connectToParticipants(nextParticipants = participantsRef.current) {
    if (!hasJoinedRef.current) {
      return;
    }

    const activeKeys = new Set(nextParticipants.map((participant) => participant.participantKey));
    peersRef.current.forEach((_peer, remoteParticipantKey) => {
      if (!activeKeys.has(remoteParticipantKey)) {
        removePeer(remoteParticipantKey);
      }
    });

    nextParticipants
      .filter((participant) => participant.participantKey !== participantKey)
      .forEach((participant) => {
        const peerExists = peersRef.current.has(participant.participantKey);
        getPeer(participant.participantKey);
        sendMediaState(participant.participantKey);
        if (!peerExists && participantKey < participant.participantKey) {
          void negotiateWith(participant.participantKey);
        }
      });
  }

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
        sendMediaState();
        window.setTimeout(() => connectToParticipants(), 0);
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
      const remoteParticipantKeys = participantsRef.current
        .map((participant) => participant.participantKey)
        .filter((key) => key !== participantKey);
      remoteParticipantKeys.forEach((remoteParticipantKey) => {
        const peer = getPeer(remoteParticipantKey);
        refreshPeerTracks(peer);
        sendMediaState(remoteParticipantKey);
        window.setTimeout(() => {
          void negotiateWith(remoteParticipantKey);
        }, 100);
      });
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
    peersRef.current.forEach((peer, remoteParticipantKey) => {
      refreshPeerTracks(peer);
      sendMediaState(remoteParticipantKey);
      window.setTimeout(() => {
        void negotiateWith(remoteParticipantKey);
      }, 100);
    });
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") {
      setMediaError("Meeting recording is not available in this browser.");
      return;
    }

    try {
      setMediaError("");
      const recordingStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      recordingStreamRef.current = recordingStream;
      recordingChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const recorder = new MediaRecorder(recordingStream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${roomCode}-recording-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
        anchor.click();
        URL.revokeObjectURL(url);
        recordingStream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        recordingChunksRef.current = [];
        setIsRecording(false);
      };

      recordingStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        stopRecording();
      });
      recorder.start(1000);
      setIsRecording(true);
    } catch (recordingError) {
      setMediaError(
        recordingError instanceof Error ? recordingError.message : "Unable to start recording."
      );
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      return;
    }

    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    setIsRecording(false);
  }

  function leaveMeeting() {
    peersRef.current.forEach((peer) => peer.connection.close());
    peersRef.current.clear();
    setRemoteMedia([]);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    screenStreamRef.current = null;
    setCameraEnabled(false);
    setMicEnabled(false);
    setIsScreenSharing(false);
    setHasJoined(false);
    void fetch(`/api/meetings/${roomCode}/participants/${participantKey}`, {
      method: "DELETE",
    });
  }

  function forceMuteMic() {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = false;
    }
    setMicEnabled(false);
    void registerParticipant(isScreenSharing, cameraEnabled, false);
    setMediaError("The host muted your microphone.");
  }

  function muteParticipant(participant: InternalMeetingParticipant) {
    if (!isHost || participant.participantKey === participantKey) {
      return;
    }

    void sendSignal(participant.participantKey, "mute-audio", {});
    setParticipants((current) =>
      current.map((item) =>
        item.participantKey === participant.participantKey
          ? {
              ...item,
              micEnabled: false,
            }
          : item
      )
    );
  }

  async function endMeetingForAll() {
    if (!token || !isHost) {
      return;
    }

    const shouldEnd = window.confirm("End this meeting for everyone?");
    if (!shouldEnd) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/meetings/${roomCode}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "ended" }),
      });
      const result = (await response.json()) as InternalMeetingRecord & { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to end meeting.");
      }

      setMeeting(result);
      setMediaError("Meeting ended.");
      leaveMeeting();
    } catch (endError) {
      setMediaError(endError instanceof Error ? endError.message : "Unable to end meeting.");
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
    void registerParticipant(isScreenSharing, videoTrack.enabled, micEnabled);
    sendMediaState();
  }

  function toggleMic() {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (!audioTrack) {
      void startPreview();
      return;
    }

    audioTrack.enabled = !audioTrack.enabled;
    setMicEnabled(audioTrack.enabled);
    void registerParticipant(isScreenSharing, cameraEnabled, audioTrack.enabled);
    sendMediaState();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await meetingStageRef.current?.requestFullscreen();
    } catch (fullscreenError) {
      setMediaError(
        fullscreenError instanceof Error ? fullscreenError.message : "Unable to open fullscreen."
      );
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy link"), 1600);
  }

  return (
    <main className={`min-h-screen ${hasJoined ? "bg-black" : "bg-[#eef3f6]"}`}>
      <div
        className={`mx-auto flex min-h-screen w-full flex-col ${
          hasJoined
            ? "max-w-none p-0"
            : `px-4 py-5 sm:px-6 lg:px-8 ${activeScreenShare ? "max-w-none" : "max-w-7xl"}`
        }`}
      >
        {!hasJoined ? (
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
        ) : null}

        <section
          className={`grid flex-1 ${
            hasJoined
              ? "gap-0 py-0 lg:grid-cols-1"
              : `gap-5 py-4 ${activeScreenShare ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_22rem]"}`
          }`}
        >
          <div
            ref={meetingStageRef}
            className={`flex overflow-hidden bg-[#10262b] ${
              hasJoined
                ? "relative h-screen min-h-screen flex-col rounded-none shadow-none"
                : "min-h-[28rem] flex-col rounded-2xl shadow-[0_18px_44px_rgba(15,23,42,0.18)]"
            }`}
          >
            {hasJoined ? (
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-5 py-4 text-white">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {meeting?.title || "Internal meeting"}
                  </p>
                  <p className="mt-0.5 text-xs text-white/60">{roomCode}</p>
                </div>
              </div>
            ) : null}
            <div
              className={`flex flex-1 items-center justify-center ${
                hasJoined
                  ? "bg-[#050505] p-3 pb-24 pt-14"
                  : "bg-[radial-gradient(circle_at_50%_35%,rgba(241,166,75,0.22),transparent_30%),linear-gradient(135deg,#10262b,#061417)] p-4"
              }`}
            >
              {hasJoined ? (
                activeScreenShare ? (
                  <div className="grid h-full w-full gap-3 lg:grid-cols-[13rem_minmax(0,1fr)]">
                    <div className="flex max-h-[calc(100vh-8rem)] flex-col gap-3 overflow-y-auto pr-1">
                      <MeetingTile
                        label={localDisplayName}
                        media={streamRef.current || undefined}
                        isMuted
                        compact
                      />
                      {participantMedia.map(({ participant, media }) => (
                        <MeetingTile
                          key={participant.participantKey}
                          label={participant.displayName}
                          media={media}
                          showVideo={participant.cameraEnabled}
                          compact
                        />
                      ))}
                      {secondaryScreenShares.map((media) => {
                        return (
                          <MeetingTile
                            key={`${media.participantKey}-${media.stream.id}`}
                            media={media}
                            label={getParticipantLabel(media)}
                            isScreenShare
                            compact
                            fit="contain"
                          />
                        );
                      })}
                    </div>
                    <div className="h-full min-h-[calc(100vh-8rem)]">
                      <MeetingTile
                        media={activeScreenShare}
                        label={getParticipantLabel(activeScreenShare)}
                        isScreenShare
                        fit="contain"
                        large
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`grid h-full w-full auto-rows-fr gap-3 ${getTileGridClass(tileCount)}`}
                  >
                    <MeetingTile
                      label={localDisplayName}
                      media={streamRef.current || undefined}
                      isMuted
                    />
                    {participantMedia.map(({ participant, media }) => (
                      <MeetingTile
                        key={participant.participantKey}
                        label={participant.displayName}
                        media={media}
                        showVideo={participant.cameraEnabled}
                      />
                    ))}
                    {otherParticipants.length === 0 ? (
                      <div className="flex min-h-48 items-center justify-center rounded-xl border border-white/10 bg-white/5 p-5 text-center text-sm font-semibold text-white/70">
                        Waiting for another participant to join.
                      </div>
                    ) : null}
                  </div>
                )
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

            <div
              className={`flex flex-wrap items-center justify-center gap-3 border-t border-white/10 px-4 py-4 ${
                hasJoined
                  ? "absolute bottom-0 left-0 right-0 z-20 bg-black/82 backdrop-blur"
                  : "bg-[#0b1e22]"
              }`}
            >
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
                onClick={leaveMeeting}
                className="rounded-xl bg-[var(--color-accent-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#9f3914]"
              >
                Leave meeting
              </button>
              {hasJoined ? (
                <button
                  type="button"
                  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isScreenSharing
                      ? "bg-white text-[#0b1e22]"
                      : "bg-white/10 text-white hover:bg-white/16"
                  }`}
                >
                  {isScreenSharing ? "Stop sharing" : "Share screen"}
                </button>
              ) : null}
              {hasJoined ? (
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/16"
                >
                  {isFullscreen ? "Exit full screen" : "Full screen"}
                </button>
              ) : null}
              {hasJoined ? (
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isRecording
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-white/10 text-white hover:bg-white/16"
                  }`}
                >
                  {isRecording ? "Stop recording" : "Record"}
                </button>
              ) : null}
              {isHost && hasJoined ? (
                <button
                  type="button"
                  onClick={endMeetingForAll}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  End for all
                </button>
              ) : null}
            </div>
          </div>

          <aside className={`crm-panel p-5 ${hasJoined || activeScreenShare ? "hidden" : ""}`}>
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
                            <div className="flex flex-col items-end gap-2">
                              {participant.isScreenSharing ? (
                                <span className="rounded-full bg-[rgba(241,166,75,0.16)] px-2 py-1 text-[10px] font-semibold text-[var(--color-accent-strong)]">
                                  Sharing
                                </span>
                              ) : null}
                              {!participant.micEnabled ? (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                                  Muted
                                </span>
                              ) : null}
                              {isHost &&
                              participant.participantKey !== participantKey &&
                              participant.micEnabled ? (
                                <button
                                  type="button"
                                  onClick={() => muteParticipant(participant)}
                                  className="rounded-full border border-[var(--color-line)] px-2 py-1 text-[10px] font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
                                >
                                  Mute
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <p className="mt-5 text-xs leading-5 text-[var(--color-muted)]">
                  Camera, microphone, and screen-share streams now connect peer-to-peer with WebRTC signaling through the Werkly backend.
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
