import { Spin } from 'antd'

export default function LoadingSpinner({ tip = '加载中...' }: { tip?: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 64
    }}>
      <Spin size="large" tip={tip}>
        <div style={{ padding: 40 }} />
      </Spin>
    </div>
  )
}
