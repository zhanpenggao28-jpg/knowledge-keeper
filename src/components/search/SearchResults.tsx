import { List, Tag, Typography, Empty, Space } from 'antd'
import { FileTextOutlined, VideoCameraOutlined, PictureOutlined } from '@ant-design/icons'
import type { Item } from '../../types'
import { useAppStore } from '../../stores/appStore'

const { Text, Paragraph } = Typography

function getIcon(category: string) {
  switch (category) {
    case 'document': return <FileTextOutlined />
    case 'video': return <VideoCameraOutlined />
    case 'image': return <PictureOutlined />
    default: return <FileTextOutlined />
  }
}

export default function SearchResults({ items, total }: { items: Item[]; total: number }) {
  const { selectItem, setPreviewOpen } = useAppStore()

  if (items.length === 0) {
    return <Empty description="没有搜索到结果" />
  }

  return (
    <List
      dataSource={items}
      renderItem={(item: Item) => (
        <List.Item
          style={{
            cursor: 'pointer',
            padding: '16px',
            background: '#1e1e1e',
            borderRadius: 8,
            marginBottom: 8,
            transition: 'box-shadow 0.2s'
          }}
          onClick={() => {
            selectItem(item)
            setPreviewOpen(true)
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
          <List.Item.Meta
            avatar={getIcon(item.category)}
            title={
              <Space>
                <Text strong>{item.title || item.original_name}</Text>
                <Tag>{item.file_type.toUpperCase()}</Tag>
                {item.tags?.map(t => (
                  <Tag key={t.id} color={t.color}>{t.name}</Tag>
                ))}
              </Space>
            }
            description={item.snippet ? (
              <Paragraph
                ellipsis={{ rows: 2 }}
                style={{ marginBottom: 0 }}
              >
                <span dangerouslySetInnerHTML={{ __html: item.snippet }} />
              </Paragraph>
            ) : (item.summary || item.extracted_text?.substring(0, 200) || '暂无内容')}
          />
        </List.Item>
      )}
    />
  )
}
