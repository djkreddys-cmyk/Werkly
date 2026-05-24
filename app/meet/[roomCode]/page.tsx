import { InternalMeetingRoom } from "@/components/internal-meeting-room";

export default async function MeetingRoomPage(props: PageProps<"/meet/[roomCode]">) {
  const { roomCode } = await props.params;
  return <InternalMeetingRoom roomCode={roomCode} />;
}
