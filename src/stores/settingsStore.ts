import { create } from 'zustand'

interface SettingsState {
  sidecarPort: number | null
  sidecarStatus: 'starting' | 'running' | 'stopped' | 'error'

  setSidecarPort: (port: number) => void
  setSidecarStatus: (status: 'starting' | 'running' | 'stopped' | 'error') => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  sidecarPort: null,
  sidecarStatus: 'stopped',

  setSidecarPort: (port) => set({ sidecarPort: port }),
  setSidecarStatus: (status) => set({ sidecarStatus: status })
}))
