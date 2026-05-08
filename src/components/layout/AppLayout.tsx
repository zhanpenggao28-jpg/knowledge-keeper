import { ReactNode } from 'react'
import { Layout } from 'antd'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAppStore } from '../../stores/appStore'
import PreviewDrawer from '../preview/PreviewDrawer'

const { Content, Sider } = Layout

export default function AppLayout({ children }: { children: ReactNode }) {
  const { selectedItem, previewOpen, setPreviewOpen } = useAppStore()

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        width={240}
        style={{
          borderRight: '1px solid var(--border-color)',
          overflow: 'auto'
        }}
      >
        <Sidebar />
      </Sider>
      <Layout>
        <Header />
        <Content
          style={{
            padding: 24,
            overflow: 'auto'
          }}
        >
          {children}
        </Content>
      </Layout>
      <PreviewDrawer
        open={previewOpen}
        item={selectedItem}
        onClose={() => setPreviewOpen(false)}
      />
    </Layout>
  )
}
