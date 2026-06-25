'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { SectionNav } from './section-nav'
import { MermaidDiagram } from './mermaid-diagram'
import { AsciiFlow } from './ascii-flow'
import { LldView } from './lld-view'
import { MarkdownView } from './markdown-view'
import { SkeletonLoader } from './skeleton-loader'
import type { SectionKey } from '@/core/types/job'

interface Props {
  jobId:          string
  owner:          string
  repo:           string
  initialSections?: Partial<Record<SectionKey, string>>
  initialStatus?:   string
}

const NAV_ITEMS: { key: SectionKey; label: string }[] = [
  { key: 'diagram_arch', label: 'Architecture'   },
  { key: 'diagram_sub',  label: 'Subsystems'      },
  { key: 'hld',          label: 'HLD'             },
  { key: 'lld',          label: 'LLD'             },
  { key: 'api_flows',    label: 'API Flows'       },
  { key: 'glossary',     label: 'Glossary'        },
]

const PHASE_LABELS: Record<string, string> = {
  cloning:    'Cloning repository…',
  analyzing:  'Analysing file tree…',
  explaining: 'Building architectural explanation…',
  generating: 'Generating documentation in parallel…',
}

function DiagramSubSection({ content }: { content: string }) {
  const blocks = [...content.matchAll(/```mermaid\n([\s\S]*?)```/g)]
  const titles = [...content.matchAll(/^## (.+)$/gm)]

  if (blocks.length === 0) {
    return <MermaidDiagram definition={content} id="sub-0" />
  }

  return (
    <div className="space-y-10">
      {blocks.map((block, i) => (
        <div key={i}>
          {titles[i] && (
            <h3
              className="mb-4 text-sm font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'oklch(72% 0.22 55)' }}
            >
              {titles[i][1]}
            </h3>
          )}
          <MermaidDiagram definition={block[1].trim()} id={`sub-${i}`} />
        </div>
      ))}
    </div>
  )
}

function SectionContent({ sectionKey, content }: { sectionKey: SectionKey; content: string }) {
  switch (sectionKey) {
    case 'diagram_arch':
      return <MermaidDiagram definition={content} id="arch" />
    case 'diagram_sub':
      return <DiagramSubSection content={content} />
    case 'lld':
      return <LldView content={content} />
    case 'api_flows':
      return <AsciiFlow content={content} />
    case 'hld':
    case 'glossary':
    default:
      return <MarkdownView content={content} />
  }
}

export function DocumentationView({
  jobId,
  owner,
  repo,
  initialSections,
  initialStatus,
}: Props) {
  const [sections, setSections]   = useState<Partial<Record<SectionKey, string>>>(initialSections ?? {})
  const [activeKey, setActiveKey] = useState<SectionKey>('diagram_arch')
  const [phase, setPhase]         = useState<string>(
    initialStatus === 'complete' ? 'Complete' : initialStatus ?? 'Connecting…'
  )
  const [complete, setComplete]   = useState(
    initialStatus === 'complete' || !!initialSections
  )
  const [error, setError]         = useState<string | null>(null)
  const sectionRefs               = useRef<Record<string, HTMLElement | null>>({})
  const scrollContainerRef        = useRef<HTMLDivElement>(null)

  // Connect SSE if job is not yet complete
  useEffect(() => {
    if (complete) return

    const es = new EventSource(`/api/jobs/${jobId}/stream`)

    es.addEventListener('progress', (e: MessageEvent) => {
      const d = JSON.parse(e.data)
      setPhase(PHASE_LABELS[d.phase] ?? d.phase)
    })

    es.addEventListener('section', (e: MessageEvent) => {
      const d = JSON.parse(e.data)
      if (d.section !== 'explanation') {
        setSections(prev => ({ ...prev, [d.section as SectionKey]: d.content }))
      }
    })

    es.addEventListener('complete', () => {
      setComplete(true)
      setPhase('Complete')
      es.close()
    })

    es.addEventListener('error', (e: Event) => {
      try {
        const d = JSON.parse((e as MessageEvent).data)
        setError(d.message)
      } catch {
        // Connection error (not a data error)
      }
      es.close()
    })

    return () => es.close()
  }, [jobId, complete])

  // Scroll to section when nav item clicked
  const scrollTo = useCallback((key: string) => {
    setActiveKey(key as SectionKey)
    const el = sectionRefs.current[key]
    const container = scrollContainerRef.current
    if (!el || !container) return
    const elTop    = el.getBoundingClientRect().top
    const contTop  = container.getBoundingClientRect().top
    const offset   = 72 // status bar height
    container.scrollBy({ top: elTop - contTop - offset, behavior: 'smooth' })
  }, [])

  // Update active key on scroll — find whichever section top is at or just above the viewport
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    function onScroll() {
      const OFFSET = 80 // status bar height + a little breathing room
      const keys = NAV_ITEMS.map(i => i.key)
      let best: SectionKey = keys[0] as SectionKey

      for (const key of keys) {
        const el = sectionRefs.current[key]
        if (!el) continue
        const top = el.getBoundingClientRect().top - container!.getBoundingClientRect().top
        if (top <= OFFSET) {
          best = key as SectionKey
        }
      }

      setActiveKey(best)
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [sections])

  const navItems = NAV_ITEMS.map(item => ({
    ...item,
    done:   !!sections[item.key],
    active: item.key === activeKey,
  }))

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'oklch(3.5% 0.005 55)' }}>
      <SectionNav items={navItems} owner={owner} repo={repo} onSelect={scrollTo} />

      <div ref={scrollContainerRef} style={{ flex: 1, minWidth: 0, overflowY: 'auto', height: '100vh' }}>
        {/* Accent top stripe — matches landing page */}
        <div style={{ height: '2px', background: 'oklch(72% 0.22 55)', position: 'sticky', top: 0, zIndex: 30 }} />

        {/* Status bar */}
        <div
          style={{
            position:     'sticky',
            top:          '2px',
            zIndex:       20,
            padding:      '0 40px',
            height:       '40px',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
            background:   'oklch(3.5% 0.005 55)',
            borderBottom: '1px solid oklch(17% 0.005 55)',
          }}
        >
          <div
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        '8px',
              fontFamily: 'var(--font-mono)',
              fontSize:   '0.72rem',
              color:      'oklch(38% 0.004 55)',
            }}
          >
            <span
              className={complete ? '' : 'animate-pulse'}
              style={{
                width:        '6px',
                height:       '6px',
                borderRadius: '50%',
                background:   complete ? 'oklch(66% 0.14 140)' : 'oklch(72% 0.22 55)',
                display:      'inline-block',
                flexShrink:   0,
              }}
            />
            {complete ? 'Complete' : phase}
          </div>

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   '0.68rem',
              color:      'oklch(22% 0.003 55)',
              letterSpacing: '0.06em',
            }}
          >
            {Object.keys(sections).filter(k => k !== 'explanation').length}/{NAV_ITEMS.length} sections
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div
            style={{
              margin:     '24px 40px 0',
              padding:    '16px 20px',
              background: 'oklch(10% 0.06 25)',
              border:     '1px solid oklch(22% 0.10 25)',
              fontFamily: 'var(--font-mono)',
              fontSize:   '0.8rem',
              color:      'oklch(62% 0.16 25)',
            }}
          >
            <strong style={{ color: 'oklch(58% 0.18 25)' }}>Pipeline error: </strong>
            {error}
          </div>
        )}

        {/* Sections */}
        <div style={{ padding: '48px 40px 80px', maxWidth: '900px' }}>
          {NAV_ITEMS.map(({ key, label }) => (
            <section
              key={key}
              id={`section-${key}`}
              data-section={key}
              ref={el => { sectionRefs.current[key] = el }}
              style={{ marginBottom: '72px', scrollMarginTop: '56px' }}
            >
              {/* Section header — matches landing structural language */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '6px' }}>
                <h2
                  style={{
                    fontFamily:    'var(--font-display)',
                    fontWeight:    700,
                    fontSize:      '1.4rem',
                    letterSpacing: '-0.02em',
                    textTransform: 'uppercase',
                    color:         'oklch(95% 0.008 55)',
                    lineHeight:    1,
                  }}
                >
                  {label}
                </h2>
                {sections[key] && (
                  <span
                    style={{
                      fontFamily:    'var(--font-mono)',
                      fontSize:      '0.62rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color:         'oklch(72% 0.22 55)',
                      opacity:       0.7,
                    }}
                  >
                    ready
                  </span>
                )}
              </div>
              {/* Hard structural rule under heading */}
              <div style={{ height: '1px', background: 'oklch(17% 0.005 55)', margin: '12px 0 28px' }} />

              {sections[key] ? (
                <SectionContent sectionKey={key} content={sections[key]!} />
              ) : (
                <SkeletonLoader />
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
