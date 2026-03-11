import { getSortedStandings } from '../utils/algorithm'

const TYPE_LABELS = { americano: 'Americano', mexicano: 'Mexicano' }
const MEDALS = ['🥇', '🥈', '🥉']
const PODIUM_ORDER = [1, 0, 2] // 2nd, 1st, 3rd visually
const BAR_CLASSES = ['first', 'second', 'third']

export default function SummaryScreen({ tournament, standings, roundsPlayed, onHome }) {
  const { type, mode, players } = tournament
  const sorted = getSortedStandings(players, standings, mode)
  const top3 = sorted.slice(0, 3)

  return (
    <div className="screen">
      <div className="topbar">
        <div className="screen-title">
          🏆 Wyniki — <span>{TYPE_LABELS[type]}</span>
        </div>
      </div>

      <div className="hint">{roundsPlayed} rozegranych rund</div>

      {/* Podium */}
      {top3.length >= 2 && (
        <div className="summary-podium">
          {PODIUM_ORDER.map((idx) => {
            const row = top3[idx]
            if (!row) return <div key={idx} style={{ width: 80 }} />
            return (
              <div key={idx} className="podium-item">
                <div className="podium-rank">{MEDALS[idx]}</div>
                <div className="podium-name">{row.name}</div>
                <div className="podium-points">{row.totalPoints} pkt</div>
                <div className={`podium-bar ${BAR_CLASSES[idx]}`} />
              </div>
            )
          })}
        </div>
      )}

      {/* Full table */}
      <div className="standings-card" style={{ position: 'static' }}>
        <div className="standings-title">Pełna klasyfikacja</div>
        <table className="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Zawodnik / Para</th>
              <th>Rundy</th>
              <th>Punkty</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.player.id}>
                <td className={`rank-cell${i < 3 ? ' top' : ''}`}>
                  {MEDALS[i] || i + 1}
                </td>
                <td>{row.name}</td>
                <td style={{ color: 'var(--text-sub)' }}>{row.roundsPlayed}</td>
                <td className="points-cell">{row.totalPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn btn-large" onClick={onHome}>
        ← Nowy turniej
      </button>
    </div>
  )
}
