import { getFileURL, getThumbURL } from '../../services/api'

interface Props {
  filePath: string
  thumbnail: string | null
}

export default function VideoPreview({ filePath, thumbnail }: Props) {
  const url = getFileURL(filePath)
  const poster = getThumbURL(filePath, thumbnail)

  return (
    <video
      controls
      preload="metadata"
      poster={poster ?? undefined}
      style={{
        width: '100%',
        maxHeight: 400,
        borderRadius: 8,
        background: '#000'
      }}
      src={url}
    >
      您的浏览器不支持视频播放
    </video>
  )
}
