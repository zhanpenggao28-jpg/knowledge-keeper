import { useState } from 'react'
import { Button } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { getFileURL, getPreviewURL } from '../../services/api'

interface Props {
  filePath: string
  preview: string | null
}

export default function DocPreview({ filePath, preview }: Props) {
  const [loadPdf, setLoadPdf] = useState(false)
  const url = getFileURL(filePath)
  const cover = getPreviewURL(filePath, preview, 'document')

  if (!loadPdf) {
    return (
      <div style={{
        position: 'relative',
        width: '100%',
        height: 400,
        background: '#1a1a1a',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {cover && (
          <img src={cover} alt="" style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: 0.6
          }} />
        )}
        <Button
          type="primary"
          icon={<EyeOutlined />}
          size="large"
          onClick={() => setLoadPdf(true)}
          style={{ position: 'absolute' }}
        >
          加载 PDF 预览
        </Button>
      </div>
    )
  }

  return (
    <iframe
      src={url}
      style={{
        width: '100%',
        height: 600,
        border: '1px solid #333',
        borderRadius: 8
      }}
      title="PDF 预览"
    />
  )
}
