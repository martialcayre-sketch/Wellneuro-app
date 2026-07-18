'use client';

import { createContext, useContext, type ReactNode } from 'react';

const C5EnabledContext = createContext(false);

export function C5FeatureProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <C5EnabledContext.Provider value={enabled}>{children}</C5EnabledContext.Provider>;
}

export function useC5Enabled(): boolean {
  return useContext(C5EnabledContext);
}
