// Temporary landing (base deploy). Replaced by the full game flow in src/screens.
export default function App() {
  return (
    <main style={{ position: 'relative', height: '100%', display: 'grid', placeItems: 'center', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 70% 30%, #6637b8 0%, #101b3d 45%, #0a1128 100%)' }}>
      <div className="stars" aria-hidden />
      <div style={{ textAlign: 'center', zIndex: 1, padding: 16 }}>
        <h1 className="title" style={{ fontSize: 'clamp(48px, 10vw, 140px)', lineHeight: 0.95 }}>SPACE<br />ODYSSEY</h1>
        <p className="title" style={{ color: 'var(--white)', fontSize: 'clamp(22px, 4vw, 48px)', marginTop: 12 }}>
          MISSION <span style={{ color: 'var(--teal)' }}>SATURN</span>
        </p>
        <p style={{ fontWeight: 800, opacity: 0.85 }}>Launch window opening soon — the crew is assembling the ship.</p>
      </div>
      <style>{`
        .stars{position:absolute;inset:0;background-image:
          radial-gradient(2px 2px at 20% 30%, #fff 50%, transparent 51%),
          radial-gradient(2px 2px at 80% 20%, #ffd447 50%, transparent 51%),
          radial-gradient(1.5px 1.5px at 50% 70%, #fff 50%, transparent 51%),
          radial-gradient(2px 2px at 10% 80%, #38d9d0 50%, transparent 51%),
          radial-gradient(1.5px 1.5px at 65% 55%, #fff 50%, transparent 51%),
          radial-gradient(2px 2px at 90% 75%, #f46aa7 50%, transparent 51%);
          background-size: 300px 300px; animation: twinkle 4s ease-in-out infinite alternate;}
        @keyframes twinkle{from{opacity:.5}to{opacity:1}}
      `}</style>
    </main>
  )
}
