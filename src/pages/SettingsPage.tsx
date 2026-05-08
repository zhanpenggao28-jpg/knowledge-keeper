import { useState, useEffect } from 'react'
import { Card, Typography, Descriptions, Tag, Button, Space, App } from 'antd'
import { useSettingsStore } from '../stores/settingsStore'

const { Title } = Typography

export default function SettingsPage() {
  const { sidecarPort, sidecarStatus, setSidecarStatus } = useSettingsStore()
  const [appPaths, setAppPaths] = useState<{ userData: string; storagePath: string } | null>(null)
  const { message } = App.useApp()

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAppPaths().then(setAppPaths)
    }
  }, [])

  const statusColor: Record<string, string> = {
    running: 'green',
    stopped: 'red',
    starting: 'orange',
    error: 'red'
  }

  const statusText: Record<string, string> = {
    running: '运行中',
    stopped: '已停止',
    starting: '启动中',
    error: '错误'
  }

  return (
    <div className="fade-in">
      <Title level={4} style={{ marginBottom: 16 }}>设置</Title>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title="系统状态">
          <Descriptions column={1}>
            <Descriptions.Item label="后端服务">
              <Tag color={statusColor[sidecarStatus]}>
                {statusText[sidecarStatus]}
              </Tag>
              {sidecarPort ? ` (端口: ${sidecarPort})` : ''}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {appPaths && (
          <Card title="存储路径">
            <Descriptions column={1}>
              <Descriptions.Item label="文件存储">
                <code>{appPaths.storagePath}</code>
              </Descriptions.Item>
              <Descriptions.Item label="用户数据">
                <code>{appPaths.userData}</code>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Card title="AI 功能">
          <Descriptions column={1}>
            <Descriptions.Item label="Ollama">
              请确保已安装 <a href="https://ollama.com" target="_blank">Ollama</a> 并运行 <code>ollama pull qwen2.5:7b</code>
            </Descriptions.Item>
            <Descriptions.Item label="OCR">
              首次使用需安装: <code>pip install paddleocr</code>
            </Descriptions.Item>
            <Descriptions.Item label="语音转文字">
              首次使用需安装: <code>pip install faster-whisper</code>，另需安装 ffmpeg
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="AI 依赖安装状态">
          <Space direction="vertical">
            <Button onClick={async () => {
              try {
                const result = await fetch(`http://127.0.0.1:${sidecarPort}/health`)
                if (result.ok) message.success('后端服务正常')
                else message.error('后端服务异常')
              } catch {
                message.error('无法连接到后端服务')
              }
            }}>
              检测后端连接
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  )
}
