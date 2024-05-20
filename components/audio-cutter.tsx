"use client";

import { Play, Pause } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";


export default function AudioCutter() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    if (waveformRef.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#ddd",
        progressColor: "#f50057",
        cursorColor: "#333",
        barWidth: 2,
        barHeight: 1,
        barGap: 2,
      }) as WaveSurfer;

      wavesurfer.current.on("ready", () => {
        if (wavesurfer.current) {
          setEndTime(wavesurfer.current.getDuration());
        }
      });

      wavesurfer.current.on("error", (e) => {
        console.error(e);
      });
    }

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (wavesurfer.current && audioFile) {
      const reader = new FileReader();
      reader.readAsArrayBuffer(audioFile);
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        audioContext.decodeAudioData(arrayBuffer, (decodedData) => {
          audioBufferRef.current = decodedData;

          const audioBlob = bufferToWave(decodedData, 0, decodedData.length);
          const audioUrl = URL.createObjectURL(audioBlob);

          wavesurfer.current!.load(audioUrl);
        });
      };
    }
  }, [audioFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setAudioFile(file);
  };

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
      setIsPlaying(!isPlaying);
    }
  };

  const handleCutAudio = () => {
    if (wavesurfer.current) {
      const originalBuffer = audioBufferRef.current;
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const sampleRate = originalBuffer?.sampleRate;

      if (!sampleRate) return;

      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);

      const newBuffer = audioContext.createBuffer(
        originalBuffer.numberOfChannels,
        endSample - startSample,
        sampleRate
      );

      for (
        let channel = 0;
        channel < originalBuffer.numberOfChannels;
        channel++
      ) {
        const oldData = originalBuffer.getChannelData(channel);
        const newData = newBuffer.getChannelData(channel);
        for (let i = startSample, j = 0; i < endSample; i++, j++) {
          newData[j] = oldData[i];
        }
      }

      audioBufferRef.current = newBuffer;

      const audioBlob = bufferToWave(newBuffer, 0, newBuffer.length);
      const audioUrl = URL.createObjectURL(audioBlob);
      wavesurfer.current!.load(audioUrl);
    }
  };

  const handleDownload = () => {
    if (audioBufferRef.current) {
      const newBuffer = audioBufferRef.current;
      const blob = bufferToWave(newBuffer, 0, newBuffer.length);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "trimmed-audio.wav";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const bufferToWave = (
    abuffer: AudioBuffer,
    offset: number,
    len: number
  ): Blob => {
    const numOfChan = abuffer.numberOfChannels,
      length = len * numOfChan * 2 + 44,
      buffer = new ArrayBuffer(length),
      view = new DataView(buffer),
      channels: Float32Array[] = [],
      sampleRate = abuffer.sampleRate;

    let pos = 0;

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);

    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);

    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (let i = 0; i < abuffer.numberOfChannels; i++) {
      channels.push(abuffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        const sample = Math.max(-1, Math.min(1, channels[i][offset]));
        const sampleInt = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sampleInt, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([buffer], { type: "audio/wav" });

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Audio Cutter</h2>
      <input type="file" accept="audio/*" onChange={handleFileChange} />
      <div ref={waveformRef} className="mt-4 mb-4"></div>
      <div className="mb-4">
        <label className="block mb-2">Start Time (seconds)</label>
        <input
          type="number"
          value={startTime}
          onChange={(e) => setStartTime(Number(e.target.value))}
          className="px-2 py-1 border rounded-lg"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">End Time (seconds)</label>
        <input
          type="number"
          value={endTime}
          onChange={(e) => setEndTime(Number(e.target.value))}
          className="px-2 py-1 border rounded-lg"
        />
      </div>
      <button
        onClick={handleCutAudio}
        className="px-4 py-2 bg-green-500 text-white rounded-lg"
      >
        Cut Audio
      </button>
      <button
        onClick={handlePlayPause}
        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
      <button
        onClick={handleDownload}
        className="ml-4 px-4 py-2 bg-purple-500 text-white rounded-lg"
      >
        Download
      </button>
    </div>
  );
}
