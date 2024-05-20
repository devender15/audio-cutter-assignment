import AudioCutter from "@/components/audio-cutter";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-between p-10 h-[calc(100vh-4rem)]">
      <AudioCutter />
    </main>
  );
}
