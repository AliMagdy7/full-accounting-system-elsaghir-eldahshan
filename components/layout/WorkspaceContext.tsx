"use client";

import { createContext, useContext } from "react";

const WorkspaceContext = createContext(false);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  return <WorkspaceContext.Provider value>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceEmbedded(): boolean {
  return useContext(WorkspaceContext);
}
