"use client";

import { create } from "zustand";

interface UiState {
  // Sidebar state (commented out since sidebar is hidden)
  // mobileDrawerOpen: boolean;
  // sidebarCollapsed: boolean;
  // closeMobileDrawer: () => void;
  // toggleMobileDrawer: () => void;
  // toggleSidebarCollapse: () => void;
  
  // Other UI state
  demoMode: boolean;
  setDemoMode: (demoMode: boolean) => void;
  showCornerBadge: boolean;
  setShowCornerBadge: (show: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  // Sidebar state (commented out)
  // mobileDrawerOpen: false,
  // sidebarCollapsed: false,
  // closeMobileDrawer: () => set({ mobileDrawerOpen: false }),
  // toggleMobileDrawer: () => set((s) => ({ mobileDrawerOpen: !s.mobileDrawerOpen })),
  // toggleSidebarCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  
  // Other UI state
  demoMode: false,
  setDemoMode: (demoMode) => set({ demoMode }),
  showCornerBadge: false,
  setShowCornerBadge: (show) => set({ showCornerBadge: show }),
}));


