import { useEffect, useState } from 'react'
import { Skeleton, Typography, Empty } from 'antd'
import { getItemText } from '../../services/api'

const { Paragraph } = Typography

interface Props {
  itemId: string
}

export default function TextPreview({ itemId }: Props) {
  const [text, setText] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getItemText(itemId).then(data => {
      if (!cancelled) {
        setText(data.extracted_text || '')
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [itemId])

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />
  if (!text) return <Empty description="未能提取到文本内容" />

  return (
    <div style={{
      maxHeight: 500,
      overflow: 'auto',
      padding: 12,
      background: '#1e1e1e',
      borderRadius: 8,
      border: '1px solid #333',
      whiteSpace: 'pre-wrap',
      fontFamily: 'monospace',
      fontSize: 13,
      lineHeight: 1.8
    }}>
      {text}
    </div>
  )
}
