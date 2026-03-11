import { useState } from 'react'
import { getSortedStandings, getDisplayName } from '../utils/algorithm'

const TYPE_LABELS  = { americano: 'Americano', mexicano: 'Mexicano' }
const MODE_LABELS  = { individual: 'Indywidualnie', pairs: 'W Parach' }
const MEDALS = ['🥇', '🥈', '🥉']

function formatDate(iso) {
  const d = new Date(iso)
  const months = ['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export default function SettingsScreen({
  theme, onToggleTheme, onBack,
  tournamentHistory = [], onDeleteHistory,
}) {
  const isLight = theme === 'light'
  const [expandedId, setExpandedId]       = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const confirmDelete = () => {
    onDeleteHistory(confirmDeleteId)
    if (expandedId === confirmDeleteId) setExpandedId(null)
    setConfirmDeleteId(null)
  }

  return (
    <div className="screen">

      {/* ── Confirm delete modal ─────────────────────────────────── */}
      {confirmDeleteId && (
        <div className="picker-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="picker-modal confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-title">Usunąć turniej?</div>
            <div className="confirm-sub">
              Tej akcji nie można cofnąć. Wyniki zostaną usunięte na zawsze.
            </div>
            <div className="confirm-actions">
              <button className="btn btn-danger" onClick={confirmDelete}>Tak, usuń</button>
              <button className="btn btn-outline" onClick={() => setConfirmDeleteId(null)}>Anuluj</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="screen-title">Ustawienia</div>
      </div>

      {/* ── Theme toggle ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="label">Wygląd</div>
        <div className="settings-item">
          <div>
            <div className="settings-item-label">
              {isLight ? '☀️ Tryb jasny' : '🌙 Tryb ciemny'}
            </div>
            <div className="settings-item-sub">
              {isLight ? 'Białe tło, niebieski akcent' : 'Ciemne tło, złoty akcent'}
            </div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={isLight} onChange={onToggleTheme} />
            <span className="toggle-track" />
          </label>
        </div>
      </div>

      {/* ── Tournament history ───────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="label">Historia turniejów</div>

        {tournamentHistory.length === 0 ? (
          <div className="settings-placeholder">
            📋 Brak rozegranych turniejów
          </div>
        ) : (
          tournamentHistory.map((entry) => {
            const isExpanded = expandedId === entry.id
            const sorted = getSortedStandings(entry.players, entry.standings, entry.mode)

            return (
              <div key={entry.id} className="history-card">

                {/* Header row */}
                <div className="history-card-header">
                  <div className="history-card-meta">
                    <span className="history-type">{TYPE_LABELS[entry.type]}</span>
                    <span className="history-badge">{MODE_LABELS[entry.mode]}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="history-date">{formatDate(entry.date)}</span>
                    <button
                      className="remove-btn"
                      onClick={() => setConfirmDeleteId(entry.id)}
                      title="Usuń turniej"
                    >×</button>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="history-stats">
                  {entry.roundsPlayed} {entry.roundsPlayed === 1 ? 'runda' : 'rundy'} · {entry.activeCourts} {entry.activeCourts === 1 ? 'kort' : 'korty'} · {entry.players.length} graczy
                </div>

                {/* Collapsed: mini podium */}
                {!isExpanded && (
                  <div className="history-podium">
                    {sorted.slice(0, 3).map((row, i) => (
                      <span key={row.player.id} className="history-place">
                        {MEDALS[i]} {row.name} <strong>{row.totalPoints}</strong>
                      </span>
                    ))}
                  </div>
                )}

                {/* Expand toggle */}
                <button
                  className="history-expand-btn"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  {isExpanded ? '▲ Zwiń' : '▼ Szczegóły'}
                </button>

                {/* Expanded: full standings + all rounds */}
                {isExpanded && (
                  <div className="history-details">

                    {/* Full standings table */}
                    <div className="history-section-label">Klasyfikacja końcowa</div>
                    <table className="standings-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Zawodnik / Para</th>
                          <th>Rundy</th>
                          <th>Pkt</th>
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

                    {/* All rounds */}
                    {(entry.rounds ?? []).map((round) => (
                      <div key={round.roundNumber} className="history-round">
                        <div className="history-round-title">Runda {round.roundNumber}</div>
                        {round.matches.map((match, mi) => (
                          <div key={mi} className="history-match">
                            <span className="history-match-court">K{match.court}</span>
                            <span className="history-match-team">
                              {match.team1.map(p => getDisplayName(p, entry.mode)).join(' / ')}
                            </span>
                            <span className="history-match-score">
                              {match.team1Score} : {match.team2Score}
                            </span>
                            <span className="history-match-team" style={{ textAlign: 'right' }}>
                              {match.team2.map(p => getDisplayName(p, entry.mode)).join(' / ')}
                            </span>
                          </div>
                        ))}
                        {round.pausing.length > 0 && (
                          <div className="history-pause">
                            ⏸ {round.pausing.map(p => getDisplayName(p, entry.mode)).join(', ')} ({round.pausePoints} pkt)
                          </div>
                        )}
                      </div>
                    ))}

                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── Version ──────────────────────────────────────────────── */}
      <div className="hint" style={{ marginTop: 'auto' }}>
        Padel Turniej v0.1
      </div>
    </div>
  )
}
