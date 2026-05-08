import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { App as AntApp } from 'antd'
import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'
import { useSettingsStore } from './stores/settingsStore'
import { setApiPort } from './services/api'

export default function App() {
  const { setSidecarPort, setSidecarStatus } = useSettingsStore()

  useEffect(() => {
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onSidecarReady((port: number) => {
        setSidecarPort(port)
        setSidecarStatus('running')
        setApiPort(port)
      })

      window.electronAPI.getSidecarPort().then((port) => {
        if (port) {
          setSidecarPort(port)
          setSidecarStatus('running')
          setApiPort(port)
        }
      })

      window.electronAPI.getSidecarStatus().then((status) => {
        setSidecarStatus(status)
      })

      return () => {
        unsubscribe()
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
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </AppLayout>
      </HashRouter>
    </AntApp>
  )
}
