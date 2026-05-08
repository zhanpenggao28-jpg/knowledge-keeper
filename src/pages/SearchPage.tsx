import { useEffect, useState } from 'react'
import { Input, Typography, Space, Tag, Spin } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { useSearch } from '../hooks/useSearch'
import SearchResults from '../components/search/SearchResults'
import TypeFilter from '../components/library/TypeFilter'

const { Title } = Typography

export default function SearchPage() {
  const { searchQuery, activeCategory } = useAppStore()
  const { results, total, isSearching, search } = useSearch()
  const [inputValue, setInputValue] = useState(searchQuery)

  useEffect(() => {
    if (searchQuery) {
      setInputValue(searchQuery)
      search(searchQuery, activeCategory ?? undefined)
    }
  }, [searchQuery, activeCategory])

  const handleSearch = () => {
    if (inputValue.trim()) {
      search(inputValue.trim(), activeCategory ?? undefined)
    }
  }

  return (
    <div className="fade-in">
      <Title level={4} style={{ marginBottom: 16 }}>全文搜索</Title>

      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Space>
          <Input.Search
            placeholder="输入关键词搜索所有文件内容..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onSearch={handleSearch}
            enterButton="搜索"
            size="large"
            style={{ width: 480 }}
            allowClear
          />
          <TypeFilter />
        </Space>

        {total > 0 && (
          <span style={{ color: '#999' }}>找到 {total} 个结果</span>
        )}

        {isSearching ? (
          <Spin size="large" style={{ display: 'block', padding: 48 }} />
        ) : (
          <SearchResults items={results} total={total} />
        )}
      </Space>
    </div>
  )
}
