import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  uploadProgress: number;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setUploadProgress: (progress: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  uploadProgress: 0,
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
}));