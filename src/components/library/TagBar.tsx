import { useTags } from '../../hooks/useTags'
import { useAppStore } from '../../stores/appStore'

export default function TagBar() {
  const { tags } = useTags()
  const { activeTagId, setTagFilter } = useAppStore()

  if (tags.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      overflowX: 'auto',
      whiteSpace: 'nowrap',
      paddingBottom: 4,
      scrollbarWidth: 'thin',
      marginBottom: 12
    }}>
      <button
        onClick={() => setTagFilter(null)}
        style={{
          flexShrink: 0,
          border: activeTagId === null ? '1px solid #d4b65f' : '1px solid #3a3520',
          borderRadius: 20,
          padding: '2px 14px',
          cursor: 'pointer',
          fontSize: 13,
          background: activeTagId === null ? 'rgba(212,182,95,0.18)' : 'transparent',
          color: activeTagId === null ? '#d4b65f' : '#999',
          transition: 'all 0.2s'
        }}
      >
        全部
      </button>
      {tags.map(tag => {
        const active = activeTagId === tag.id
        return (
          <button
            key={tag.id}
            onClick={() => setTagFilter(active ? null : tag.id)}
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: active ? `1px solid ${tag.color}` : '1px solid #3a3520',
              borderRadius: 20,
              padding: '2px 14px',
              cursor: 'pointer',
              fontSize: 13,
              background: active ? `${tag.color}22` : 'transparent',
              color: active ? tag.color : '#aaa',
              transition: 'all 0.2s'
            }}
          >
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: tag.color,
              flexShrink: 0
            }} />
            <span>{tag.name}</span>
            <span style={{ color: '#666', fontSize: 11 }}>
              ({tag.item_count ?? 0})
            </span>
          </button>
        )
      })}
    </div>
  )
}
