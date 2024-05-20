"use client";

import { useState } from "react";

import WelcomeSection from "./welcome-section";
import Controller from "./controller";

export default function AudioCutter() {
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setAudioFile(file);
  };

  return (
    <div className="p-2 rounded-lg w-full h-full">
      {audioFile ? (
        <Controller audioFile={audioFile} setAudioFile={setAudioFile} />
      ) : (
        <WelcomeSection handleFileChange={handleFileChange} />
      )}
    </div>
  );
}
