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

export default function App() {
  const [screen, setScreen] = useState('home')
  const [prevScreen, setPrevScreen] = useState('home')
  const [tournament, setTournament] = useState(initialTournament)
  const [rounds, setRounds] = useState([])
  const [standings, setStandings] = useState({})
  const [currentRound, setCurrentRound] = useState(null)
  const [history, setHistory] = useState({})        // partner/opponent/pause rotation
  const [prevState, setPrevState] = useState(null)  // for undo
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [tournamentHistory, setTournamentHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tournamentHistory')) || [] }
    catch { return [] }
  })

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
    // Zapisz stan przed zmianą (dla undo)
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

  const endTournament = (completedRound) => {
    const newStandings = calculateStandings(standings, completedRound)
    const finalRoundsCount = rounds.length + 1
    setStandings(newStandings)
    setRounds((r) => [...r, completedRound])

    // Zapisz turniej do historii
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
    setScreen('home')
  }

  const openSettings = () => {
    setPrevScreen(screen)
    setScreen('settings')
  }

  return (
    <div className="app">
      {/* Sticky gear bar — zawsze w granicach .app, nigdy poza ekranem */}
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
          roundNumber={rounds.length + 1}
          standings={standings}
          onFinishRound={finishRound}
          onEndTournament={endTournament}
          canUndo={!!prevState}
          onUndoRound={undoRound}
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
