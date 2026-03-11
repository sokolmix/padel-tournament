import { useState } from 'react'
import { getDisplayName, getSortedStandings } from '../utils/algorithm'

const TYPE_LABELS = { americano: 'Americano', mexicano: 'Mexicano' }

function ScorePicker({ matchIdx, side, pointsPerRound, onSelect, onClose }) {
  const nums = Array.from({ length: pointsPerRound + 1 }, (_, i) => i)
  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="picker-header">
          <span className="picker-title">Wybierz wynik</span>
          <button className="picker-close" onClick={onClose}>✕</button>
        </div>
        <div className="picker-grid">
          {nums.map((n) => (
            <button
              key={n}
              className="picker-num"
              onClick={() => onSelect(matchIdx, side, n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="picker-overlay" onClick={onCancel}>
      <div className="picker-modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-title">Zakończyć turniej?</div>
        <div className="confirm-sub">
          Wyniki zostaną zapisane i zobaczysz końcową klasyfikację.
        </div>
        <div className="confirm-actions">
          <button className="btn btn-danger btn-large" onClick={onConfirm}>
            Tak, zakończ turniej
          </button>
          <button className="btn btn-outline btn-large" onClick={onCancel}>
            Anuluj
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RoundScreen({
  tournament,
  round,
  roundNumber,
  standings,
  onFinishRound,
  onEndTournament,
  canUndo,
  onUndoRound,
}) {
  const { type, mode, players, pointsPerRound } = tournament
  const isPairs = mode === 'pairs'

  // Initialize scores from round if they exist (undo case), otherwise empty
  const [scores, setScores] = useState(() =>
    round.matches.map((m) => ({
      team1Score: m.team1Score ?? '',
      team2Score: m.team2Score ?? '',
    }))
  )
  const [picker, setPicker] = useState(null)
  const [confirmEnd, setConfirmEnd] = useState(false)

  // Reset scores when round changes (e.g. after undo or next round)
  const [lastRoundNum, setLastRoundNum] = useState(roundNumber)
  if (roundNumber !== lastRoundNum) {
    setScores(
      round.matches.map((m) => ({
        team1Score: m.team1Score ?? '',
        team2Score: m.team2Score ?? '',
      }))
    )
    setLastRoundNum(roundNumber)
  }

  const handlePickScore = (matchIdx, side, value) => {
    const other = side === 'team1Score' ? 'team2Score' : 'team1Score'
    setScores((prev) => {
      const next = [...prev]
      const updated = { ...next[matchIdx], [side]: String(value) }
      const otherVal = pointsPerRound - value
      if (otherVal >= 0) updated[other] = String(otherVal)
      next[matchIdx] = updated
      return next
    })
    setPicker(null)
  }

  const isMatchValid = (score) => {
    const t1 = parseInt(score.team1Score)
    const t2 = parseInt(score.team2Score)
    if (isNaN(t1) || isNaN(t2)) return false
    return t1 + t2 === pointsPerRound
  }

  const isMatchFilled = (score) =>
    score.team1Score !== '' && score.team2Score !== ''

  const allValid = scores.every(isMatchValid)
  const allFilled = scores.every(isMatchFilled)

  const buildCompletedRound = () => ({
    ...round,
    matches: round.matches.map((m, i) => ({
      ...m,
      team1Score: scores[i].team1Score,
      team2Score: scores[i].team2Score,
    })),
  })

  const sortedStandings = getSortedStandings(players, standings, mode)


  const renderCourtCard = (match, i) => {
    const score = scores[i]
    const filled = isMatchFilled(score)
    const valid = isMatchValid(score)
    return (
      <div
        key={i}
        className={`court-card${filled && !valid ? ' invalid-score' : filled && valid ? ' valid-score' : ''}`}
      >
        <div className="court-label">Kort {match.court}</div>
        <div className="match-row">
          <div className="team">
            {match.team1.map((p, pi) => (
              <div key={pi} className="team-name">{getDisplayName(p, mode)}</div>
            ))}
          </div>

          <div className="vs-col">
            <div className="vs-label">VS</div>
            <div className="score-inputs">
              <button
                className={`score-btn${score.team1Score !== '' ? (valid ? ' score-valid' : ' score-filled') : ''}`}
                onClick={() => setPicker({ matchIdx: i, side: 'team1Score' })}
              >
                {score.team1Score !== '' ? score.team1Score : '—'}
              </button>
              <span className="score-sep">:</span>
              <button
                className={`score-btn${score.team2Score !== '' ? (valid ? ' score-valid' : ' score-filled') : ''}`}
                onClick={() => setPicker({ matchIdx: i, side: 'team2Score' })}
              >
                {score.team2Score !== '' ? score.team2Score : '—'}
              </button>
            </div>
          </div>

          <div className="team right">
            {match.team2.map((p, pi) => (
              <div key={pi} className="team-name">{getDisplayName(p, mode)}</div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      {/* Score picker modal */}
      {picker && (
        <ScorePicker
          matchIdx={picker.matchIdx}
          side={picker.side}
          pointsPerRound={pointsPerRound}
          onSelect={handlePickScore}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Confirm end tournament modal */}
      {confirmEnd && (
        <ConfirmModal
          onConfirm={() => { setConfirmEnd(false); onEndTournament(buildCompletedRound()) }}
          onCancel={() => setConfirmEnd(false)}
        />
      )}

      {/* Header */}
      <div className="round-header">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="round-badge">RUNDA {roundNumber}</span>
          <span className="type-badge">{TYPE_LABELS[type]}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="type-badge">{isPairs ? 'W Parach' : 'Indywidualnie'}</span>
          {canUndo && (
            <button className="undo-btn" onClick={onUndoRound} title="Cofnij rundę">
              ↩ Cofnij
            </button>
          )}
        </div>
      </div>

      {/* Pause banner */}
      {round.pausing.length > 0 && (
        <div className="pause-banner">
          ⏸ Pauzuje ({round.pausePoints} pkt):{' '}
          <strong>
            {round.pausing.map((p) => getDisplayName(p, mode)).join(', ')}
          </strong>
        </div>
      )}

      {/* Main layout */}
      <div className="round-layout">
        {/* Courts */}
        <div className="courts-list">
          {round.matches.map((match, i) => renderCourtCard(match, i))}

          {/* Action buttons */}
          <div className="action-bar">
            <button
              className="btn btn-large"
              onClick={() => onFinishRound(buildCompletedRound())}
              disabled={!allValid}
            >
              Następna runda →
            </button>
            <button
              className="btn btn-large btn-danger"
              onClick={() => setConfirmEnd(true)}
              disabled={!allValid}
            >
              Zakończ turniej
            </button>
          </div>

          {!allFilled && (
            <div className="hint">Kliknij wynik, aby uzupełnić</div>
          )}
          {allFilled && !allValid && (
            <div className="hint" style={{ color: 'var(--danger)' }}>
              Suma punktów na każdym korcie musi wynosić {pointsPerRound}
            </div>
          )}
        </div>

        {/* Standings */}
        <div className="standings-card">
          <div className="standings-title">Klasyfikacja</div>
          {sortedStandings.length === 0 ? (
            <div className="hint">Brak wyników — wypełnij pierwszą rundę</div>
          ) : (
            <table className="standings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Zawodnik</th>
                  <th>R</th>
                  <th>Pkt</th>
                </tr>
              </thead>
              <tbody>
                {sortedStandings.map((row, i) => (
                  <tr key={row.player.id}>
                    <td className={`rank-cell${i < 3 ? ' top' : ''}`}>{i + 1}</td>
                    <td>{row.name}</td>
                    <td style={{ color: 'var(--text-sub)' }}>{row.roundsPlayed}</td>
                    <td className="points-cell">{row.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
