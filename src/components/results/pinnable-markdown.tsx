'use client'
import { useState, useRef } from 'react'
import { MarkdownView } from './markdown-view'

interface Props {
  content:   string
  onPin:     (text: string) => void
}

/**
 * Wraps MarkdownView with a selection-to-pin affordance.
 * When the user selects text and releases the mouse, a small ✦ button
 * appears near the selection. Clicking it pins that text as chat context.
 */
export function PinnableMarkdown({ content, onPin }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function handleMouseUp() {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setTooltip(null)
      return
    }

    const selectedText = selection.toString().trim()
    if (selectedText.length < 20) {
      setTooltip(null)
      return
    }

    // Position the button near the end of the selection
    const range = selection.getRangeAt(0)
    const rect  = range.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) return

    setTooltip({
      x:    rect.right - containerRect.left,
      y:    rect.bottom - containerRect.top + 6,
      text: selectedText,
    })
  }

  function handlePin() {
    if (!tooltip) return
    onPin(tooltip.text)
    setTooltip(null)
    window.getSelection()?.removeAllRanges()
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative' }}
      onMouseUp={handleMouseUp}
    >
      <MarkdownView content={content} />

      {tooltip && (
        <button
          onClick={handlePin}
          style={{
            position:    'absolute',
            left:        `${tooltip.x}px`,
            top:         `${tooltip.y}px`,
            transform:   'translateX(-50%)',
            background:  'oklch(72% 0.22 55)',
            color:       'oklch(4% 0.005 55)',
            border:      'none',
            padding:     '3px 10px',
            fontFamily:  'var(--font-mono)',
            fontSize:    '0.62rem',
            fontWeight:  700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor:      'pointer',
            zIndex:      40,
            whiteSpace:  'nowrap',
            display:     'flex',
            alignItems:  'center',
            gap:         '5px',
            boxShadow:   '0 2px 12px oklch(0% 0 0 / 0.5)',
          }}
        >
          <span>✦</span>
          <span>Pin to chat</span>
        </button>
      )}
    </div>
  )
}
