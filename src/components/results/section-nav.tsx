'use client'

export interface NavItem {
  key:    string
  label:  string
  done:   boolean
  active: boolean
}

interface Props {
  items:    NavItem[]
  owner:    string
  repo:     string
  onSelect: (key: string) => void
}

const BG      = 'oklch(3.5% 0.005 55)'
const SURFACE = 'oklch(9% 0.007 55)'
const BORDER  = 'oklch(17% 0.005 55)'
const ACCENT  = 'oklch(72% 0.22 55)'
const T0      = 'oklch(95% 0.008 55)'
const T2      = 'oklch(62% 0.006 55)'
const T3      = 'oklch(38% 0.004 55)'
const T4      = 'oklch(22% 0.003 55)'

export function SectionNav({ items, owner, repo, onSelect }: Props) {
  return (
    <nav
      style={{
        width:       '224px',
        minWidth:    '224px',
        height:      '100vh',
        position:    'sticky',
        top:         0,
        display:     'flex',
        flexDirection: 'column',
        background:  BG,
        borderRight: `1px solid ${BORDER}`,
        overflow:    'hidden',
      }}
    >
      {/* Accent top stripe — matches landing */}
      <div style={{ height: '2px', background: ACCENT, flexShrink: 0 }} />

      {/* Repo identity */}
      <div
        style={{
          padding:      '18px 20px 16px',
          borderBottom: `1px solid ${BORDER}`,
          flexShrink:   0,
        }}
      >
        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.62rem',
            color:         T3,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom:  '5px',
          }}
        >
          {owner}
        </div>
        <div
          style={{
            fontFamily:  'var(--font-display)',
            fontWeight:  700,
            fontSize:    '0.95rem',
            color:       T0,
            letterSpacing: '-0.01em',
            overflow:    'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:  'nowrap',
          }}
        >
          {repo}
        </div>
      </div>

      {/* Nav items */}
      <div
        style={{
          flex:     1,
          padding:  '14px 12px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.6rem',
            color:         T4,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            padding:       '0 8px 10px',
          }}
        >
          Documentation
        </div>

        {items.map(item => (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            style={{
              width:       '100%',
              display:     'flex',
              alignItems:  'center',
              gap:         '10px',
              padding:     '8px 10px',
              marginBottom:'2px',
              background:  item.active ? 'oklch(72% 0.22 55 / 0.1)' : 'transparent',
              border:      item.active ? `1px solid oklch(72% 0.22 55 / 0.2)` : '1px solid transparent',
              cursor:      'pointer',
              fontFamily:  'var(--font-mono)',
              fontSize:    '0.75rem',
              color:       item.active ? ACCENT : item.done ? T2 : T3,
              textAlign:   'left',
              transition:  'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => {
              if (!item.active) (e.currentTarget as HTMLElement).style.background = 'oklch(13% 0.006 55)'
            }}
            onMouseLeave={e => {
              if (!item.active) (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            {/* Status indicator — dot, not checkmark */}
            <span
              style={{
                width:       '5px',
                height:      '5px',
                borderRadius:'50%',
                flexShrink:  0,
                background:  item.active
                  ? ACCENT
                  : item.done
                    ? 'oklch(62% 0.006 55)'
                    : 'oklch(22% 0.003 55)',
              }}
            />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding:   '14px 20px',
          borderTop: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
      >
        <a
          href="/"
          style={{
            fontFamily:  'var(--font-mono)',
            fontSize:    '0.7rem',
            color:       T3,
            textDecoration: 'none',
            letterSpacing: '0.04em',
            display:     'flex',
            alignItems:  'center',
            gap:         '6px',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = T2}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = T3}
        >
          ← new repo
        </a>
      </div>
    </nav>
  )
}
