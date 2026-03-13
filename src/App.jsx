import { useState, useEffect } from 'react'
import HomeScreen from './screens/HomeScreen'
import ModeScreen from './screens/ModeScreen'
import SetupScreen from './screens/SetupScreen'
import RoundScreen from './screens/RoundScreen'
import SummaryScreen from './screens/SummaryScreen'
import SettingsScreen from './screens/SettingsScreen'
import { generateRound, calculateStandings } from './utils/algorithm'
import './App.css'

const initialTournament = {
  type: null,
  mode: null,
  courts: 2,
  pointsPerRound: 21,
  players: [],
}

// Wczytaj zapisany stan turnieju — wykonuje się raz przy ładowaniu modułu
const _saved = (() => {
  try { return JSON.parse(localStorage.getItem('activeTournament')) || null }
  catch { return null }
})()

export default function App() {
  const [screen, setScreen]           = useState(_saved?.screen       ?? 'home')
  const [prevScreen, setPrevScreen]   = useState(_saved?.prevScreen   ?? 'home')
  const [tournament, setTournament]   = useState(_saved?.tournament   ?? initialTournament)
  const [rounds, setRounds]           = useState(_saved?.rounds       ?? [])
  const [standings, setStandings]     = useState(_saved?.standings    ?? {})
  const [currentRound, setCurrentRound] = useState(_saved?.currentRound ?? null)
  const [history, setHistory]         = useState(_saved?.history      ?? {})
  const [prevState, setPrevState]     = useState(null)  // undo — nie persistujemy
  const [theme, setTheme]             = useState(() => localStorage.getItem('theme') || 'dark')
  const [tournamentHistory, setTournamentHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tournamentHistory')) || [] }
    catch { return [] }
  })

  // Zapisuj aktywny turniej przy każdej zmianie stanu
  useEffect(() => {
    if (screen === 'home') {
      localStorage.removeItem('activeTournament')
    } else {
      localStorage.setItem('activeTournament', JSON.stringify({
        screen, prevScreen, tournament, rounds, standings, currentRound, history,
      }))
    }
  }, [screen, prevScreen, tournament, rounds, standings, currentRound, history])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () =>
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const update = (u) => setTournament((p) => ({ ...p, ...u }))

  const startTournament = (finalTournament) => {
    localStorage.setItem(
      `lastPlayers_${finalTournament.mode}`,
      JSON.stringify(finalTournament.players)
    )
    const emptyHistory = {}
    const round = generateRound(finalTournament, {}, 1, emptyHistory)
    setCurrentRound(round)
    setHistory(round.updatedHistory)
    setRounds([])
    setStandings({})
    setPrevState(null)
    setScreen('round')
  }

  const finishRound = (completedRound) => {
    setPrevState({ round: completedRound, standings, rounds, history })
    const newStandings = calculateStandings(standings, completedRound)
    const newRounds = [...rounds, completedRound]
    setStandings(newStandings)
    setRounds(newRounds)
    const next = generateRound(tournament, newStandings, newRounds.length + 1, history)
    setCurrentRound(next)
    setHistory(next.updatedHistory)
  }

  const undoRound = () => {
    if (!prevState) return
    setStandings(prevState.standings)
    setRounds(prevState.rounds)
    setHistory(prevState.history)
    setCurrentRound(prevState.round)
    setPrevState(null)
  }

  const updateCurrentRoundScores = (scores) => {
    setCurrentRound((prev) => ({
      ...prev,
      matches: prev.matches.map((m, i) => ({
        ...m,
        team1Score: scores[i]?.team1Score ?? m.team1Score,
        team2Score: scores[i]?.team2Score ?? m.team2Score,
      })),
    }))
  }

  const editPastRound = (roundIdx, updatedRound) => {
    const newRounds = rounds.map((r, i) => (i === roundIdx ? updatedRound : r))
    let newStandings = {}
    for (const r of newRounds) {
      newStandings = calculateStandings(newStandings, r)
    }
    setRounds(newRounds)
    setStandings(newStandings)
  }

  const endTournament = (completedRound) => {
    const newStandings = calculateStandings(standings, completedRound)
    const finalRoundsCount = rounds.length + 1
    setStandings(newStandings)
    setRounds((r) => [...r, completedRound])

    const unitsPerCourt = tournament.mode === 'pairs' ? 2 : 4
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: tournament.type,
      mode: tournament.mode,
      players: tournament.players,
      standings: newStandings,
      rounds: [...rounds, completedRound],
      roundsPlayed: finalRoundsCount,
      activeCourts: Math.floor(tournament.players.length / unitsPerCourt),
    }
    const updated = [entry, ...tournamentHistory]
    setTournamentHistory(updated)
    localStorage.setItem('tournamentHistory', JSON.stringify(updated))

    setScreen('summary')
  }

  const deleteHistoryEntry = (id) => {
    const updated = tournamentHistory.filter((e) => e.id !== id)
    setTournamentHistory(updated)
    localStorage.setItem('tournamentHistory', JSON.stringify(updated))
  }

  const goHome = () => {
    setTournament(initialTournament)
    setRounds([])
    setStandings({})
    setCurrentRound(null)
    setHistory({})
    setPrevState(null)
    localStorage.removeItem('activeTournament')
    setScreen('home')
  }

  const openSettings = () => {
    setPrevScreen(screen)
    setScreen('settings')
  }

  return (
    <div className="app">
      {screen !== 'settings' && (
        <div className="gear-bar">
          <button className="gear-btn" onClick={openSettings} title="Ustawienia">
            ⚙️
          </button>
        </div>
      )}

      {screen === 'home' && (
        <HomeScreen
          onSelect={(type) => { update({ type }); setScreen('mode') }}
        />
      )}
      {screen === 'mode' && (
        <ModeScreen
          type={tournament.type}
          onSelect={(mode) => { update({ mode }); setScreen('setup') }}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'setup' && (
        <SetupScreen
          tournament={tournament}
          onUpdate={update}
          onStart={startTournament}
          onBack={() => setScreen('mode')}
        />
      )}
      {screen === 'round' && currentRound && (
        <RoundScreen
          tournament={tournament}
          round={currentRound}
          rounds={rounds}
          roundNumber={rounds.length + 1}
          standings={standings}
          onFinishRound={finishRound}
          onEndTournament={endTournament}
          canUndo={!!prevState}
          onUndoRound={undoRound}
          onScoresChange={updateCurrentRoundScores}
          onEditPastRound={editPastRound}
        />
      )}
      {screen === 'summary' && (
        <SummaryScreen
          tournament={tournament}
          standings={standings}
          roundsPlayed={rounds.length}
          onHome={goHome}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          theme={theme}
          onToggleTheme={toggleTheme}
          onBack={() => setScreen(prevScreen)}
          tournamentHistory={tournamentHistory}
          onDeleteHistory={deleteHistoryEntry}
        />
      )}
    </div>
  )
}
