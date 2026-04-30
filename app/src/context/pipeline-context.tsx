"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { PipelineProgress } from "@/lib/types";

interface PipelineContextValue {
  isRunning: boolean;
  progress: PipelineProgress | null;
  setIsRunning: (v: boolean) => void;
  setProgress: (p: PipelineProgress | null) => void;
}

const PipelineContext = createContext<PipelineContextValue>({
  isRunning: false,
  progress: null,
  setIsRunning: () => {},
  setProgress: () => {},
});

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);

  return (
    <PipelineContext.Provider
      value={{ isRunning, progress, setIsRunning, setProgress }}
    >
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  return useContext(PipelineContext);
}
