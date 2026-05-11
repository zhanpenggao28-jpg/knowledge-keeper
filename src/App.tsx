import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { App as AntApp } from 'antd'
import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import SettingsPage from './pages/SettingsPage'
import { useSettingsStore } from './stores/settingsStore'
import { setApiPort } from './services/api'
import { useAppStore } from './stores/appStore'

export default function App() {
  const { setSidecarPort, setSidecarStatus } = useSettingsStore()

  // Global drop handler for file import — capture phase ensures we catch it
  // before any child element can interfere
  // Drag acceptance is handled by index.html inline script (dragover)
  // and useDragImport hook (dragenter/dragleave/drop visual overlay).
  // On drop, Chromium navigates to file:/// which main process intercepts via will-navigate.
  // (Electron 33 removed File.path from renderer, so we rely on main-process interception)

  useEffect(() => {
    if (window.electronAPI) {
      const onReady = (port: number) => {
        setSidecarPort(port)
        setSidecarStatus('running')
        setApiPort(port)
        useAppStore.getState().bumpTagRefresh()
        useAppStore.getState().bumpCollectionRefresh()
      }
      const unsubscribe = window.electronAPI.onSidecarReady(onReady)

      window.electronAPI.getSidecarPort().then((port) => {
        if (port) {
          onReady(port)
        }
      })

      window.electronAPI.getSidecarStatus().then((status) => {
        setSidecarStatus(status)
      })

      // Refresh items when main-process drop import completes
      const unsubDrop = window.electronAPI.onDropImportComplete(() => {
        useAppStore.getState().loadItems()
      })

      return () => {
        unsubscribe()
        unsubDrop()
      }
    }
  }, [])

  return (
    <AntApp>
      <HashRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </AppLayout>
      </HashRouter>
    </AntApp>
  )
}
