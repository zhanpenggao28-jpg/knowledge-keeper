import { Segmented } from 'antd'
import { FileTextOutlined, PictureOutlined, VideoCameraOutlined, AppstoreOutlined } from '@ant-design/icons'
import { useAppStore } from '../../stores/appStore'

export default function TypeFilter() {
  const { activeCategory, setCategory } = useAppStore()

  return (
    <Segmented
      value={activeCategory ?? 'all'}
      onChange={(val) => setCategory(val === 'all' ? null : val as string)}
      options={[
        { label: '全部', value: 'all', icon: <AppstoreOutlined /> },
        { label: '文档', value: 'document', icon: <FileTextOutlined /> },
        { label: '图片', value: 'image', icon: <PictureOutlined /> },
        { label: '视频', value: 'video', icon: <VideoCameraOutlined /> },
      ]}
    />
  )
}
