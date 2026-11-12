import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/session";
import { getRecording } from "@/features/recordings/server";
import { isUuid } from "@/features/recordings/audio-formats";
import { RecordingDetail } from "@/components/recordings/recording-detail";

export default async function RecordingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const recording = await getRecording(user.uid, id); // scoped to the caller's own subcollection
  if (!recording) notFound();
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <RecordingDetail recording={recording} />
    </main>
  );
}
