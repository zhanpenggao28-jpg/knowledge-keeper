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
          colorPrimary: '#d4b65f',
          colorInfo: '#d4b65f',
          colorSuccess: '#7cb85c',
          colorWarning: '#e6a23c',
          colorError: '#e05d5d',
          borderRadius: 8,
          colorBgContainer: '#1e1e1e',
          colorBgElevated: '#262626',
          colorBgLayout: '#141414',
          colorBorder: '#333333',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
)
