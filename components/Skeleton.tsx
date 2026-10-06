// Placeholder berkedip saat data masih dimuat, ganti konten asli begitu siap.
export function Skeleton({ h = 14, w = '100%', r = 10 }: { h?: number; w?: string | number; r?: number }) {
  return <span className="sk" style={{ height: h, width: w, borderRadius: r }} />
}

export function CardSkeleton() {
  return (
    <div className="sk-card">
      <span className="sk" style={{ aspectRatio: '3/2', width: '100%', height: 'auto' }} />
      <span className="sk" style={{ height: 16, width: '68%', borderRadius: 6 }} />
      <span className="sk" style={{ height: 12, width: '46%', borderRadius: 6 }} />
    </div>
  )
}

export function CardGridSkeleton({ n = 6 }: { n?: number }) {
  return <div className="grid">{Array.from({ length: n }, (_, i) => <CardSkeleton key={i} />)}</div>
}

export function PageSkeleton() {
  return (
    <div className="w page">
      <div className="pagehead">
        <span className="sk" style={{ height: 30, width: 210, borderRadius: 10 }} />
        <span className="sk" style={{ height: 14, width: '72%', borderRadius: 6 }} />
      </div>
      <div className="bar"><span className="sk" style={{ height: 44, width: '100%', borderRadius: 999 }} /></div>
      <CardGridSkeleton n={6} />
    </div>
  )
}