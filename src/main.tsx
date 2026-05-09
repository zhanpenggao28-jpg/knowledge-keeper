import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#c8a84e',
          colorInfo: '#c8a84e',
          colorSuccess: '#5b9a4b',
          colorWarning: '#c98a3e',
          colorError: '#d94a4a',
          borderRadius: 10,
          colorBgContainer: '#111113',
          colorBgElevated: '#18181b',
          colorBgLayout: '#0a0a0b',
          colorBorder: '#1f1f24',
          colorText: '#ededef',
          colorTextSecondary: '#888890',
          fontSize: 14,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
)
