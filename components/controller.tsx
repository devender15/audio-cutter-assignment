import { X, Play, Pause, Scissors, Redo, Undo } from "lucide-react";

import { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ControllerProps = {
  audioFile: File;
  setAudioFile: React.Dispatch<React.SetStateAction<File | null>>;
};

export default function Controller({
  audioFile,
  setAudioFile,
}: ControllerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const undoStack = useRef<AudioBuffer[]>([]);
  const redoStack = useRef<AudioBuffer[]>([]);

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

          undoStack.current = [];
          redoStack.current = [];
        });
      };
    }
  }, [audioFile]);

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
      setIsPlaying(!isPlaying);
    }
  };

  const handleCutAudio = () => {
    if (audioBufferRef.current) {
      undoStack.current.push(audioBufferRef.current);

      redoStack.current = [];

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

  const handleUndo = () => {
    if (undoStack.current.length > 0) {
      redoStack.current.push(audioBufferRef.current!);

      const lastState = undoStack.current.pop()!;
      audioBufferRef.current = lastState;

      const audioBlob = bufferToWave(lastState, 0, lastState.length);
      const audioUrl = URL.createObjectURL(audioBlob);
      wavesurfer.current!.load(audioUrl);
    }
  };

  const handleRedo = () => {
    if (redoStack.current.length > 0) {
      undoStack.current.push(audioBufferRef.current!);

      const lastState = redoStack.current.pop()!;
      audioBufferRef.current = lastState;

      const audioBlob = bufferToWave(lastState, 0, lastState.length);
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

  const handleRemoveFile = () => {
    setAudioFile(null);
  };

  return (
    <div className="w-full h-full flex flex-col gap-y-12">
      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button>
              <X size={35} />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="dark:bg-main bg-gray-100">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                file.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveFile}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex flex-col gap-y-4 lg:gap-y-3">
        <div ref={waveformRef} className="mt-4"></div>

        <div className="flex gap-4 justify-end w-full">
          <button
            onClick={handleCutAudio}
            className="flex gap-x-2 items-center p-3 rounded-md dark:bg-gray-800 bg-gray-50"
          >
            <Scissors size={20} />
            Cut
          </button>

          <button
            onClick={handleRedo}
            disabled={redoStack.current.length === 0}
            className="flex gap-x-2 items-center p-3 rounded-md dark:bg-gray-800 bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed"
          >
            <Redo size={20} />
            Redo
          </button>

          <button
            onClick={handleUndo}
            disabled={undoStack.current.length === 0}
            className="flex gap-x-2 items-center p-3 rounded-md dark:bg-gray-800 bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed"
          >
            <Undo size={20} />
            Undo
          </button>
        </div>
      </div>

      <div className="w-full absolute bottom-4 left-0 px-4 border-t pt-8 flex flex-col lg:flex-row justify-between items-end gap-y-6 lg:gap-y-0">
        <button
          onClick={handlePlayPause}
          className="p-2 rounded-full bg-gray-50 dark:bg-gray-600 w-40 flex justify-center"
        >
          {isPlaying ? (
            <Pause size={30} className="dark:text-white" />
          ) : (
            <Play size={30} className="dark:text-white" />
          )}
        </button>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="">
            <label className="block mb-2">Start Time (seconds)</label>
            <input
              type="number"
              value={startTime}
              onChange={(e) => setStartTime(Number(e.target.value))}
              className="px-2 py-1 border rounded-full"
            />
          </div>
          <div className="">
            <label className="block mb-2">End Time (seconds)</label>
            <input
              type="number"
              value={endTime}
              onChange={(e) => setEndTime(Number(e.target.value))}
              className="px-2 py-1 border rounded-full"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleDownload}
            className="rounded-full w-40 p-2 border dark:bg-slate-50 dark:text-black bg-gray-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
