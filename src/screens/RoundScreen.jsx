import { useState, useMemo, useEffect } from 'react'
import { getDisplayName, getSortedStandings, calculateStandings } from '../utils/algorithm'

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
  rounds,
  roundNumber,
  standings,
  onFinishRound,
  onEndTournament,
  canUndo,
  onUndoRound,
  onScoresChange,
  onEditPastRound,
}) {
  const { type, mode, players, pointsPerRound } = tournament
  const isPairs = mode === 'pairs'

  const [scores, setScores] = useState(() =>
    round.matches.map((m) => ({
      team1Score: m.team1Score ?? '',
      team2Score: m.team2Score ?? '',
    }))
  )
  const [picker, setPicker] = useState(null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [viewingRoundIdx, setViewingRoundIdx] = useState(rounds.length)

  // Reset when a new round starts or undo happens
  useEffect(() => {
    setScores(
      round.matches.map((m) => ({
        team1Score: m.team1Score ?? '',
        team2Score: m.team2Score ?? '',
      }))
    )
    setViewingRoundIdx(rounds.length)
  }, [roundNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload scores when navigating between rounds
  useEffect(() => {
    const idx = Math.min(viewingRoundIdx, rounds.length)
    if (idx === rounds.length) {
      setScores(
        round.matches.map((m) => ({
          team1Score: m.team1Score ?? '',
          team2Score: m.team2Score ?? '',
        }))
      )
    } else {
      setScores(
        rounds[idx].matches.map((m) => ({
          team1Score: m.team1Score ?? '',
          team2Score: m.team2Score ?? '',
        }))
      )
    }
  }, [viewingRoundIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clamp na wypadek chwilowej niespójności po cofnięciu rundy:
  // rounds.length maleje zanim useEffect zdąży zaktualizować viewingRoundIdx
  const safeIdx = Math.min(viewingRoundIdx, rounds.length)
  const isCurrentRound = safeIdx === rounds.length
  const isEditable = true  // każda runda jest edytowalna
  const displayedRound = isCurrentRound ? round : rounds[safeIdx]

  // Standings — zawsze aktualny stan (wszystkie ukończone rundy + bieżąca runda),
  // niezależnie od tego którą rundę oglądamy
  const displayedStandings = useMemo(() => {
    const validMatches = round.matches
      .map((m) => {
        const t1 = parseInt(m.team1Score)
        const t2 = parseInt(m.team2Score)
        if (!isNaN(t1) && !isNaN(t2) && t1 + t2 === pointsPerRound) return m
        return null
      })
      .filter(Boolean)
    if (validMatches.length === 0 && round.pausing.length === 0) return standings
    return calculateStandings(standings, { ...round, matches: validMatches })
  }, [standings, round, pointsPerRound])

  const sortedStandings = getSortedStandings(players, displayedStandings, mode)

  const canGoPrev = safeIdx > 0
  const canGoNext = safeIdx < rounds.length

  const handlePickScore = (matchIdx, side, value) => {
    const other = side === 'team1Score' ? 'team2Score' : 'team1Score'
    const next = scores.map((s, idx) => {
      if (idx !== matchIdx) return s
      const updated = { ...s, [side]: String(value) }
      const otherVal = pointsPerRound - value
      if (otherVal >= 0) updated[other] = String(otherVal)
      return updated
    })
    setScores(next)
    if (isCurrentRound) {
      onScoresChange?.(next)
    } else {
      const updatedRound = {
        ...displayedRound,
        matches: displayedRound.matches.map((m, i) => ({
          ...m,
          team1Score: next[i].team1Score,
          team2Score: next[i].team2Score,
        })),
      }
      onEditPastRound?.(safeIdx, updatedRound)
    }
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

  // For editable rounds use local scores state; for read-only use stored scores
  const displayedScores = isEditable
    ? scores
    : displayedRound.matches.map((m) => ({
        team1Score: m.team1Score ?? '',
        team2Score: m.team2Score ?? '',
      }))

  const allValid = displayedScores.every(isMatchValid)
  const allFilled = displayedScores.every(isMatchFilled)

  const buildCompletedRound = () => ({
    ...round,
    matches: round.matches.map((m, i) => ({
      ...m,
      team1Score: scores[i].team1Score,
      team2Score: scores[i].team2Score,
    })),
  })

  const renderCourtCard = (match, i) => {
    const score = displayedScores[i]
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
                onClick={isEditable ? () => setPicker({ matchIdx: i, side: 'team1Score' }) : undefined}
                disabled={!isEditable}
              >
                {score.team1Score !== '' ? score.team1Score : '—'}
              </button>
              <span className="score-sep">:</span>
              <button
                className={`score-btn${score.team2Score !== '' ? (valid ? ' score-valid' : ' score-filled') : ''}`}
                onClick={isEditable ? () => setPicker({ matchIdx: i, side: 'team2Score' }) : undefined}
                disabled={!isEditable}
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
          <button
            className="nav-btn"
            onClick={() => setViewingRoundIdx((v) => v - 1)}
            disabled={!canGoPrev}
            title="Poprzednia runda"
          >←</button>
          <span className="round-badge">RUNDA {displayedRound.roundNumber}</span>
          <span className="type-badge">{TYPE_LABELS[type]}</span>
          <button
            className="nav-btn"
            onClick={() => setViewingRoundIdx((v) => v + 1)}
            disabled={!canGoNext}
            title="Następna runda"
          >→</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="type-badge">{isPairs ? 'W Parach' : 'Indywidualnie'}</span>
          {canUndo && isCurrentRound && (
            <button className="undo-btn" onClick={onUndoRound} title="Cofnij rundę">
              ↩ Cofnij
            </button>
          )}
        </div>
      </div>

      {/* Pause banner */}
      {displayedRound.pausing.length > 0 && (
        <div className="pause-banner">
          ⏸ Pauzuje ({displayedRound.pausePoints} pkt):{' '}
          <strong>
            {displayedRound.pausing.map((p) => getDisplayName(p, mode)).join(', ')}
          </strong>
        </div>
      )}

      {/* Main layout */}
      <div className="round-layout">
        {/* Courts */}
        <div className="courts-list">
          {displayedRound.matches.map((match, i) => renderCourtCard(match, i))}

          {/* Action buttons */}
          <div className="action-bar">
            <button
              className={`btn btn-large${!isCurrentRound ? ' btn-muted' : ''}`}
              onClick={() => onFinishRound(buildCompletedRound())}
              disabled={!isCurrentRound || !allValid}
            >
              Następna runda →
            </button>
            <button
              className={`btn btn-large btn-danger${!isCurrentRound ? ' btn-muted' : ''}`}
              onClick={() => setConfirmEnd(true)}
              disabled={!isCurrentRound || !allValid}
            >
              Zakończ turniej
            </button>
          </div>

          {isCurrentRound && !allFilled && (
            <div className="hint">Kliknij wynik, aby uzupełnić</div>
          )}
          {isEditable && allFilled && !allValid && (
            <div className="hint" style={{ color: 'var(--danger)' }}>
              Suma punktów na każdym korcie musi wynosić {pointsPerRound}
            </div>
          )}
          {!isEditable && (
            <div className="hint">Przeglądasz archiwalną rundę — tylko bieżąca i poprzednia są edytowalne</div>
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
