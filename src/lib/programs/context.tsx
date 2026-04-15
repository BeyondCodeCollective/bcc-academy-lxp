"use client";

import { createContext, useContext } from "react";
import type { ProgramConfig } from "./types";

const ProgramContext = createContext<ProgramConfig | null>(null);

export function ProgramProvider({
  program,
  children,
}: {
  program: ProgramConfig;
  children: React.ReactNode;
}) {
  return (
    <ProgramContext.Provider value={program}>
      {children}
    </ProgramContext.Provider>
  );
}

export function useProgram(): ProgramConfig {
  const ctx = useContext(ProgramContext);
  if (!ctx) {
    throw new Error("useProgram must be used within a ProgramProvider");
  }
  return ctx;
}
