import { getPreviewURL } from '../../services/api'

interface Props {
  filePath: string
  preview: string | null
}

export default function ImagePreview({ filePath, preview }: Props) {
  const url = getPreviewURL(filePath, preview, 'image')

  return (
    <img
      src={url!}
      alt="预览"
      style={{
        width: '100%',
        maxHeight: 500,
        objectFit: 'contain',
        borderRadius: 8,
        background: 'var(--bg-elevated)'
      }}
    />
  )
}
