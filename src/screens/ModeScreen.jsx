const TYPE_LABELS = { americano: 'Americano', mexicano: 'Mexicano' }

export default function ModeScreen({ type, onSelect, onBack }) {
  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="screen-title">
          <span>{TYPE_LABELS[type]}</span> — Tryb gry
        </div>
      </div>

      <div className="tile-grid">
        <div className="tile" onClick={() => onSelect('individual')}>
          <div className="tile-icon">🏃</div>
          <div className="tile-title">Indywidualnie</div>
          <div className="tile-desc">
            Partnerzy i przeciwnicy dobierani losowo co rundę.
          </div>
        </div>

        <div className="tile" onClick={() => onSelect('pairs')}>
          <div className="tile-icon">👥</div>
          <div className="tile-title">W Parach</div>
          <div className="tile-desc">
            Stałe pary. Zmieniają się tylko przeciwnicy.
          </div>
        </div>
      </div>
    </div>
  )
}
