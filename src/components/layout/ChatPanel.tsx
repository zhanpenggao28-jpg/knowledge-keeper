import { useState, useRef, useEffect } from 'react'
import { Input, Button, Typography, Card, Tag, Space } from 'antd'
import { SendOutlined, RobotOutlined, CloseOutlined, LoadingOutlined } from '@ant-design/icons'
import { sendChatMessage } from '../../services/api'
import { useAppStore } from '../../stores/appStore'

const { Text, Paragraph } = Typography

interface Message {
  role: 'user' | 'ai'
  text: string
  action?: string
  result?: any
  results?: { action: string; result: any }[]
}

export default function ChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight)
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)

    try {
      const selectedIds = Array.from(useAppStore.getState().selectedIds)
      const data = await sendChatMessage(
        text,
        messages.slice(-8).map(m => ({ role: m.role, text: m.text, action: m.action, result: m.result })),
        selectedIds
      )
      const aiMsg: Message = {
        role: 'ai',
        text: data.message || '处理完成',
        action: data.action,
        result: data.result,
        results: data.results
      }
      setMessages(prev => [...prev, aiMsg])

      // Refresh app state after state-changing actions
      const actions = data.action === 'batch' && data.results
        ? data.results.map(r => r.action)
        : [data.action]
      const allResults = data.action === 'batch' && data.results
        ? data.results.map(r => r.result).filter(Boolean)
        : (data.result ? [data.result] : [])

      if (allResults.some((r: any) => r && !r.error)) {
        const store = useAppStore.getState()
        // When AI finds files, select them in the UI
        const searchResult = allResults.find((r: any) => r?.items?.length > 0)
        if (searchResult) {
          store.selectAll(searchResult.items.map((i: any) => i.id))
        }
        if (actions.some(a => ['create_collection', 'add_to_collection', 'delete_collection'].includes(a))) {
          store.loadCollections()
        }
        if (actions.some(a => ['batch_rename', 'batch_categorize', 'batch_tag', 'add_to_collection', 'remove_tag', 'batch_delete'].includes(a))) {
          store.loadItems()
        }
        if (actions.some(a => ['batch_tag', 'remove_tag'].includes(a))) {
          store.bumpTagRefresh()
        }
        if (actions.some(a => ['batch_delete', 'add_to_collection'].includes(a))) {
          store.clearSelection()
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'AI 服务暂时不可用，请检查 Ollama 是否运行' }])
    } finally {
      setLoading(false)
    }
  }

  const renderSingleResult = (r: any, action?: string) => {
    if (r.error) return <Tag color="red">错误: {r.error}</Tag>
    if (r.items) {
      // search_files result — show file list
      return (
        <div>
          <Tag color="blue">找到 {r.total} 个文件</Tag>
          <div style={{ maxHeight: 150, overflow: 'auto', marginTop: 4, fontSize: 11 }}>
            {r.items.slice(0, 20).map((item: any) => (
              <div key={item.id} style={{ padding: '2px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--accent)' }}>{item.title || item.original_name}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{item.file_type} · {item.category}</span>
              </div>
            ))}
            {r.total > 20 && <div style={{ color: 'var(--text-muted)' }}>...还有 {r.total - 20} 个</div>}
          </div>
        </div>
      )
    }
    if (r.renamed) {
      const parts: string[] = []
      if (r.remove_prefix) parts.push(`删除前缀「${r.remove_prefix}」`)
      if (r.remove_suffix) parts.push(`删除后缀「${r.remove_suffix}」`)
      if (r.prefix) parts.push(`添加前缀「${r.prefix}」`)
      if (r.suffix) parts.push(`添加后缀「${r.suffix}」`)
      return <Tag color="green">已重命名 {r.renamed} 个文件{parts.length > 0 ? `（${parts.join('，')}）` : ''}</Tag>
    }
    if (r.tagged) return <Tag color="green">已标记 {r.tagged} 个文件</Tag>
    if (r.categorized) return <Tag color="green">已分类 {r.categorized} 个文件</Tag>
    if (r.added) return <Tag color="green">{r.created ? '已创建并' : ''}添加 {r.added} 个文件到「{r.collection}」</Tag>
    if (r.deleted_files) return <Tag color="red">已删除 {r.deleted_files} 个文件</Tag>
    if (r.deleted_tag) return <Tag color="orange">已删除标签「{r.tag_name}」</Tag>
    if (r.deleted) return <Tag color="orange">已删除收藏集「{r.collection}」</Tag>
    if (r.created) return <Tag color="green">已创建收藏集「{r.name}」</Tag>
    if (r.removed_from !== undefined) return <Tag color="green">已从 {r.removed_from} 个文件移除{r.detail}</Tag>
    if (r.extracted_text !== undefined) {
      return (
        <div style={{ maxHeight: 200, overflow: 'auto', fontSize: 12, lineHeight: '18px', background: 'var(--bg-base)', padding: 8, borderRadius: 6, whiteSpace: 'pre-wrap' }}>
          {r.summary && <Tag color="blue" style={{ marginBottom: 6 }}>摘要: {r.summary}</Tag>}
          {r.extracted_text || '(无文本内容)'}
        </div>
      )
    }
    if (r.total_files !== undefined) {
      return (
        <Space size={4} wrap>
          <Tag>文件总数: {r.total_files}</Tag>
          {r.by_category?.map((c: any) => (
            <Tag key={c.category} color="blue">{c.category}: {c.cnt}</Tag>
          ))}
          <Tag>标签: {r.tag_count}</Tag>
          <Tag>收藏集: {r.collection_count}</Tag>
        </Space>
      )
    }
    return null
  }

  const renderResult = (msg: Message) => {
    if (msg.results) {
      return (
        <div>
          {msg.results.map((r, i) => (
            <div key={i} style={{ marginTop: i > 0 ? 6 : 0 }}>
              {renderSingleResult(r.result, r.action)}
            </div>
          ))}
        </div>
      )
    }
    if (!msg.result) return null
    return renderSingleResult(msg.result, msg.action)
  }

  return (
    <Card
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 380,
        height: 520,
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1050,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)'
      }}
      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: 16, overflow: 'hidden' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space>
          <RobotOutlined style={{ color: 'var(--accent)', fontSize: 18 }} />
          <Text strong style={{ color: 'var(--text)' }}>AI 助手</Text>
        </Space>
        <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} />
      </div>

      <div ref={listRef} style={{ flex: 1, overflow: 'auto', marginBottom: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 120 }}>
            <RobotOutlined style={{ fontSize: 40, marginBottom: 16 }} />
            <Paragraph type="secondary" style={{ fontSize: 13 }}>
              你可以让我帮你：<br />
              • 创建收藏集/文件夹<br />
              • 搜索并分类文件<br />
              • 批量重命名、加标签<br />
              • 查看库统计
            </Paragraph>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 12, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
            <div style={{
              display: 'inline-block',
              maxWidth: '90%',
              padding: '8px 14px',
              borderRadius: msg.role === 'user' ? 'var(--radius-md) var(--radius-md) 4px var(--radius-md)' : 'var(--radius-md) var(--radius-md) var(--radius-md) 4px',
              background: msg.role === 'user' ? 'var(--accent-dim)' : 'var(--bg-hover)',
              color: 'var(--text)',
              fontSize: 13,
              lineHeight: '20px',
              wordBreak: 'break-word'
            }}>
              {msg.text}
              {(msg.result || msg.results) && <div style={{ marginTop: 8 }}>{renderResult(msg)}</div>}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ textAlign: 'left', marginBottom: 12 }}>
            <Text type="secondary"><LoadingOutlined /> AI 思考中...</Text>
          </div>
        )}
      </div>

      <Input
        placeholder="输入指令，如：帮我把所有TXT文件加前缀【AI】"
        value={input}
        onChange={e => setInput(e.target.value)}
        onPressEnter={send}
        disabled={loading}
        style={{
          borderRadius: 'var(--radius-pill)',
          background: 'var(--bg-base)',
          borderColor: 'var(--border)'
        }}
        suffix={
          <Button
            type="text"
            size="small"
            icon={loading ? <LoadingOutlined /> : <SendOutlined />}
            onClick={send}
            disabled={loading}
            style={{ color: 'var(--accent)' }}
          />
        }
      />
    </Card>
  )
}
