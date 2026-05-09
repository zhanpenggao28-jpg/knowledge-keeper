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
      gap: 6,
      overflowX: 'auto',
      whiteSpace: 'nowrap',
      paddingBottom: 6,
      scrollbarWidth: 'thin',
      marginBottom: 14
    }}>
      <button
        onClick={() => setTagFilter(null)}
        style={{
          flexShrink: 0,
          border: activeTagId === null ? '1px solid var(--accent)' : '1px solid var(--border)',
          borderRadius: 'var(--radius-pill)',
          padding: '3px 14px',
          cursor: 'pointer',
          fontSize: 12,
          background: activeTagId === null ? 'var(--accent-dim)' : 'transparent',
          color: activeTagId === null ? 'var(--accent)' : 'var(--text-secondary)',
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
              gap: 5,
              border: active ? `1px solid ${tag.color}` : '1px solid var(--border)',
              borderRadius: 'var(--radius-pill)',
              padding: '3px 12px',
              cursor: 'pointer',
              fontSize: 12,
              background: active ? `${tag.color}18` : 'transparent',
              color: active ? tag.color : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: tag.color,
              flexShrink: 0
            }} />
            <span>{tag.name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              ({tag.item_count ?? 0})
            </span>
          </button>
        )
      })}
    </div>
  )
}
