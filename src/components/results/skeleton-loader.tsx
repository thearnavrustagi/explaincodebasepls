export function SkeletonLoader() {
  return (
    <div style={{ padding: '4px 0' }}>
      {[88, 74, 82, 56, 90, 68, 44].map((w, i) => (
        <div
          key={i}
          className="skeleton-shimmer"
          style={{
            width:         `${w}%`,
            height:        '11px',
            background:    'oklch(14% 0.005 55)',
            marginBottom:  '10px',
            animationDelay:`${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  )
}
