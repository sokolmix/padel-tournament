import { useState, useEffect } from 'react'

const TYPE_LABELS = { americano: 'Americano', mexicano: 'Mexicano' }

export default function SetupScreen({ tournament, onUpdate, onStart, onBack }) {
  const { type, mode, courts, pointsPerRound, players } = tournament
  const isPairs = mode === 'pairs'

  const [name, setName] = useState('')
  const [name2, setName2] = useState('')

  // Wczytaj graczy z poprzedniego turnieju w tym samym trybie
  useEffect(() => {
    if (players.length > 0) return
    try {
      const saved = JSON.parse(localStorage.getItem(`lastPlayers_${mode}`))
      if (Array.isArray(saved) && saved.length > 0) {
        onUpdate({ players: saved })
      }
    } catch (_) {}
  }, [])

  const minPlayers = isPairs ? 2 : 4 // min units to have 1 court

  const addPlayer = () => {
    const n = name.trim()
    if (!n) return
    if (isPairs && !name2.trim()) return

    const newPlayer = isPairs
      ? { id: Date.now(), name1: n, name2: name2.trim() }
      : { id: Date.now(), name: n }

    onUpdate({ players: [...players, newPlayer] })
    setName('')
    setName2('')
  }

  const removePlayer = (id) => {
    onUpdate({ players: players.filter((p) => p.id !== id) })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addPlayer()
  }

  const unitsPerCourt = isPairs ? 2 : 4
  const activeCourts = Math.floor(players.length / unitsPerCourt)
  const numPausing = players.length - activeCourts * unitsPerCourt
  const canStart = activeCourts >= 1

  const handleStart = () => {
    onStart(tournament)
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="screen-title">
          <span>{TYPE_LABELS[type]}</span> — {isPairs ? 'W Parach' : 'Indywidualnie'}
        </div>
      </div>

      {/* Courts — auto computed */}
      <div className="setup-section">
        <div className="label">Korty</div>
        <div className="courts-auto">
          {activeCourts === 0 ? (
            <span className="courts-auto-hint">
              — dodaj co najmniej {unitsPerCourt} {isPairs ? 'pary' : 'zawodników'}
            </span>
          ) : (
            Array.from({ length: activeCourts }, (_, i) => (
              <div key={i} className="court-chip">🎾 Kort {i + 1}</div>
            ))
          )}
          {activeCourts > 0 && numPausing > 0 && (
            <span className="courts-auto-pause">⏸ {numPausing} pauzuje/rundę</span>
          )}
        </div>
      </div>

      {/* Points */}
      <div className="setup-section">
        <div className="label">Punkty na rundę</div>
        <div className="input-row">
          <input
            type="number"
            className="input input-small"
            value={pointsPerRound}
            min={2}
            max={99}
            onChange={(e) =>
              onUpdate({ pointsPerRound: parseInt(e.target.value) || 21 })
            }
          />
          <span className="hint" style={{ textAlign: 'left', lineHeight: '44px' }}>
            Pauza = {Math.ceil(pointsPerRound / 2)} pkt
          </span>
        </div>
      </div>

      {/* Add players */}
      <div className="setup-section">
        <div className="label">
          {isPairs ? 'Dodaj parę' : 'Dodaj zawodnika'} ({players.length} dodanych)
        </div>
        {isPairs ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="input-row">
              <input
                className="input"
                placeholder="Zawodnik 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <input
                className="input"
                placeholder="Zawodnik 2"
                value={name2}
                onChange={(e) => setName2(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button className="btn" onClick={addPlayer}>+ Dodaj parę</button>
          </div>
        ) : (
          <div className="input-row">
            <input
              className="input"
              placeholder="Imię zawodnika"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btn" onClick={addPlayer}>+</button>
          </div>
        )}
      </div>

      {/* Player list */}
      {players.length > 0 && (
        <div className="setup-section">
          <div className="player-list">
            {players.map((p, i) => (
              <div key={p.id} className="player-item">
                <span className="player-num">{i + 1}</span>
                <span className="player-name">
                  {isPairs
                    ? `${p.name1 ?? '?'} & ${p.name2 ?? '?'}`
                    : (p.name ?? '?')}
                </span>
                <button className="remove-btn" onClick={() => removePlayer(p.id)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      {!canStart && (
        <div className="hint">
          Potrzebujesz co najmniej {unitsPerCourt} {isPairs ? 'pary' : 'zawodników'}
        </div>
      )}

      <button className="btn btn-large" onClick={handleStart} disabled={!canStart}>
        Rozpocznij turniej →
      </button>
    </div>
  )
}
