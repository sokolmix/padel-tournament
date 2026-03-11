export default function HomeScreen({ onSelect }) {
  return (
    <div className="screen">
      <div className="hero">
        <div className="hero-logo">🎾</div>
        <h1>Padel <span>Turniej</span></h1>
        <p>Wybierz format gry, aby rozpocząć</p>
      </div>

      <div className="tile-grid">
        <div className="tile" onClick={() => onSelect('americano')}>
          <div className="tile-icon">🔀</div>
          <div className="tile-title">Americano</div>
          <div className="tile-desc">
            Losowanie partnerów i przeciwników co rundę. Maksymalna rotacja.
          </div>
        </div>

        <div className="tile" onClick={() => onSelect('mexicano')}>
          <div className="tile-icon">📊</div>
          <div className="tile-title">Mexicano</div>
          <div className="tile-desc">
            Runda wstępna losowo, kolejne rundy dobór wg rankingu.
          </div>
        </div>
      </div>

      <div className="hint" style={{ marginTop: 'auto', paddingBottom: 16 }}>
        Wyniki każdego meczu sumują się do końcowej klasyfikacji
      </div>
    </div>
  )
}
