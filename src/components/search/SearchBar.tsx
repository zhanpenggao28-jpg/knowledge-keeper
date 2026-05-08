import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { useState, useCallback } from 'react'

export default function SearchBar() {
  const { setSearchQuery } = useAppStore()
  const navigate = useNavigate()
  const [value, setValue] = useState('')

  const handleSearch = useCallback(() => {
    if (value.trim()) {
      setSearchQuery(value)
      navigate('/search')
    }
  }, [value])

  return (
    <Input
      placeholder="搜索文件内容..."
      prefix={<SearchOutlined style={{ color: '#bbb' }} />}
      value={value}
      onChange={e => setValue(e.target.value)}
      onPressEnter={handleSearch}
      allowClear
      style={{ flex: 1, maxWidth: 480 }}
    />
  )
}
