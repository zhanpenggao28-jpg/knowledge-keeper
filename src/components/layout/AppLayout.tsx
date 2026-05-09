import { ReactNode } from 'react'
import { Layout } from 'antd'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAppStore } from '../../stores/appStore'
import PreviewDrawer from '../preview/PreviewDrawer'

const { Content, Sider } = Layout

export default function AppLayout({ children }: { children: ReactNode }) {
  const { selectedItem, previewOpen, setPreviewOpen, refreshKey } = useAppStore()

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        width={220}
        style={{
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          overflow: 'auto'
        }}
      >
        <Sidebar />
      </Sider>
      <Layout>
        <Header />
        <Content
          style={{
            padding: 28,
            overflow: 'auto',
            background: 'var(--bg-base)'
          }}
        >
          {children}
        </Content>
      </Layout>
      <PreviewDrawer
        open={previewOpen}
        item={selectedItem}
        onClose={() => setPreviewOpen(false)}
        refreshKey={refreshKey}
      />
    </Layout>
  )
}
