import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Statistic, Typography, Space, Button } from 'antd'
import { FileTextOutlined, PictureOutlined, VideoCameraOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { useItems } from '../hooks/useItems'
import ItemGrid from '../components/library/ItemGrid'
import ImportDialog from '../components/library/ImportDialog'

const { Title } = Typography

export default function HomePage() {
  const navigate = useNavigate()
  const { items, refresh } = useItems()
  const { selectItem, setPreviewOpen } = useAppStore()
  const loadItems = useAppStore(s => s.loadItems)
  const allItems = useAppStore(s => s.items)
  const total = useAppStore(s => s.total)
  const [importOpen, setImportOpen] = useState(false)

  const docCount = allItems.filter(i => i.category === 'document').length
  const imageCount = allItems.filter(i => i.category === 'image').length
  const videoCount = allItems.filter(i => i.category === 'video').length

  useEffect(() => {
    loadItems({ limit: 100 })
  }, [])

  const recent = allItems.slice(0, 6)

  return (
    <div className="fade-in">
      <Title level={4} style={{ marginBottom: 16 }}>概览</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="文件总数" value={total} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="文档" value={docCount} prefix={<FileTextOutlined style={{ color: '#d4b65f' }} />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="图片" value={imageCount} prefix={<PictureOutlined style={{ color: '#d4b65f' }} />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="视频" value={videoCount} prefix={<VideoCameraOutlined style={{ color: '#d4b65f' }} />} />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={5} style={{ margin: 0 }}>最近添加</Title>
        <Space>
          <Button icon={<SearchOutlined />} onClick={() => navigate('/search')}>搜索</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setImportOpen(true)}>导入文件</Button>
        </Space>
      </div>

      <ItemGrid
        items={recent}
        onItemClick={(item) => {
          selectItem(item)
          setPreviewOpen(true)
        }}
        onDelete={async (id) => { await (await import('../services/api')).deleteItem(id); refresh() }}
        onReprocess={async (id) => { await (await import('../services/api')).reprocessItem(id) }}
        onEditTags={() => {}}
        onRename={() => {}}
      />

      <ImportDialog open={importOpen} onClose={() => { setImportOpen(false); refresh() }} />
    </div>
  )
}
