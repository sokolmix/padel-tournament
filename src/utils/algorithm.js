// ─── Helpers ───────────────────────────────────────────────────────────────

export function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ─── Berger Circle Method ──────────────────────────────────────────────────
//
// Dla n jednostek (graczy lub par), metoda kołowa gwarantuje:
//   • każdy gra z każdym jako partner dokładnie raz (przez n−1 rund)
//   • każdy gra przeciwko każdemu dokładnie dwa razy
//   • pauzy rotują równomiernie między cyklami
//
// Jednostka na indeksie 0 jest "zakotwiczona" (stoi w miejscu);
// pozostałe n−1 rotują o 1 pozycję co rundę.
// Jeśli n jest nieparzyste → dodajemy „ducha" (null) żeby n było parzyste;
// duch rotuje jak każda inna jednostka i naturalnie „wypycha" innych na pozycję pauzy.

/**
 * Inicjalizuje kolejność Bergera na nowy cykl.
 * Tasuje graczy/pary i uzupełnia do parzystej liczby null-duchem jeśli potrzeba.
 */
function initBergerOrder(units) {
  const shuffled = shuffle([...units])
  return shuffled.length % 2 === 0 ? shuffled : [...shuffled, null]
}

/**
 * Generuje sekwencję Bergera dla rundy o indeksie `roundIndex`.
 * units[0] stoi w miejscu; reszta obraca się o 1.
 * units.length musi być parzyste.
 */
function bergerSequence(units, roundIndex) {
  const n = units.length        // parzyste
  const r = roundIndex % (n - 1) // cykl: n−1 rund
  const rotating = units.slice(1)
  const rotated = [...rotating.slice(r), ...rotating.slice(0, r)]
  return [units[0], ...rotated]
}

/**
 * Buduje mecze ze sekwencji grających jednostek metodą Whist.
 *
 * Indywidualnie (4 graczy / kort):
 *   top  = seq[0..2k−1]
 *   bottom = odwrócone seq[2k..4k−1]
 *   Kort c: (top[2c] + bottom[2c+1]) vs (top[2c+1] + bottom[2c])
 *
 * W Parach (2 pary / kort):
 *   top[c] vs bottom[c]
 */
function buildWhistMatches(seq, activeCourts, mode) {
  const n = seq.length  // activeCourts*(isPairs?2:4)

  return Array.from({ length: activeCourts }, (_, c) => {
    if (mode === 'pairs') {
      // Pary: kort c → seq[c] vs seq[n-1-c]  (klasyczne Berger dla par)
      return {
        court: c + 1,
        team1: [seq[c]],
        team2: [seq[n - 1 - c]],
        team1Score: '',
        team2Score: '',
      }
    }
    // Indywidualnie: kort c → {seq[2c], seq[n-1-2c]} vs {seq[2c+1], seq[n-2-2c]}
    // Formuła gwarantuje 28/28 unikalnych par dla n=8, brak powtórzeń przez n-1 rund
    return {
      court: c + 1,
      team1: [seq[2 * c],     seq[n - 1 - 2 * c]],
      team2: [seq[2 * c + 1], seq[n - 2 - 2 * c]],
      team1Score: '',
      team2Score: '',
    }
  })
}

// ─── Main entry point ──────────────────────────────────────────────────────
//
// history: { bergerOrder?, bergerIndex?, pauseHistory? }
//   pauseHistory: { [playerId]: { count: number, lastPausedRound: number } }
//
// Zwraca round + updatedHistory

export function generateRound(tournament, standings, roundNumber, history = {}) {
  const { type, mode, courts, pointsPerRound, players } = tournament
  const isPairs = mode === 'pairs'
  const unitsPerCourt = isPairs ? 2 : 4
  // Korty dobierane automatycznie: 1 kort na każdą pełną grupę unitsPerCourt graczy
  const activeCourts = Math.floor(players.length / unitsPerCourt)
  const pausePoints = Math.ceil(pointsPerRound / 2)

  let { bergerOrder, bergerIndex = 0, pauseHistory = {} } = history

  // Inicjalizacja na starcie turnieju (lub po resetcie)
  if (!bergerOrder) {
    bergerOrder = initBergerOrder(players)
    bergerIndex = 0
  }

  let matches = []
  let pausing = []
  let newBergerOrder = bergerOrder
  let newBergerIndex = bergerIndex
  let newPauseHistory = { ...pauseHistory }

  if (type === 'mexicano' && roundNumber > 1) {
    // ── Mexicano R2+: dobór wg rankingu (snake) ──────────────────────────
    const sorted = [...players].sort(
      (a, b) => (standings[b.id]?.totalPoints ?? 0) - (standings[a.id]?.totalPoints ?? 0)
    )

    const activeCount = activeCourts * unitsPerCourt
    const playing = sorted.slice(0, activeCount)
    pausing = sorted.slice(activeCount)

    for (let c = 0; c < activeCourts; c++) {
      if (isPairs) {
        matches.push({
          court: c + 1,
          team1: [playing[c * 2]],
          team2: [playing[c * 2 + 1]],
          team1Score: '', team2Score: '',
        })
      } else {
        const [p1, p2, p3, p4] = playing.slice(c * 4, c * 4 + 4)
        matches.push({
          court: c + 1,
          team1: [p1, p4],  // 1. + 4. (snake — wyrównanie sił)
          team2: [p2, p3],  // 2. + 3.
          team1Score: '', team2Score: '',
        })
      }
    }
    // Mexicano nie przesuwa indeksu Bergera

  } else {
    // ── Americano / Mexicano R1 ───────────────────────────────────────────
    //
    // 1. Wybierz pauzujących wg fair-pause queue
    //    • priorytety do pauzy: najmniej dotychczasowych pauz
    //    • przy remisie: najdawniej pauzował (można pauzować znowu)
    //      → chroni przed 2× pauzą z rzędu
    const numToPause = players.length - activeCourts * unitsPerCourt

    if (numToPause > 0) {
      const sorted = [...players].sort((a, b) => {
        const ca = pauseHistory[a.id]?.count ?? 0
        const cb = pauseHistory[b.id]?.count ?? 0
        if (ca !== cb) return ca - cb          // mniej pauz → pauzuje teraz
        const la = pauseHistory[a.id]?.lastPausedRound ?? -999
        const lb = pauseHistory[b.id]?.lastPausedRound ?? -999
        return la - lb  // dawno pauzował → idzie na początek (pauzuje); niedawno → koniec (gra)
      })
      pausing = sorted.slice(0, numToPause)

      // Zaktualizuj historię pauzy
      pausing.forEach(p => {
        newPauseHistory[p.id] = {
          count: (newPauseHistory[p.id]?.count ?? 0) + 1,
          lastPausedRound: roundNumber,
        }
      })
    }

    // 2. Berger sequence → gracze grający w kolejności Bergera
    const seq = bergerSequence(bergerOrder, bergerIndex)
    const realSeq = seq.filter(p => p !== null)
    const pausingIds = new Set(pausing.map(p => p.id))
    const playingSeq = realSeq.filter(p => !pausingIds.has(p.id))

    matches = buildWhistMatches(playingSeq, activeCourts, mode)

    // 3. Przesuń indeks Bergera; po wyczerpaniu cyklu nowe tasowanie
    const cycleLen = bergerOrder.length - 1  // n_parzyste − 1 rund / cykl
    newBergerIndex = bergerIndex + 1
    if (newBergerIndex >= cycleLen) {
      newBergerOrder = initBergerOrder(players)
      newBergerIndex = 0
    }
  }

  return {
    roundNumber,
    matches,
    pausing,
    pausePoints,
    updatedHistory: {
      bergerOrder: newBergerOrder,
      bergerIndex: newBergerIndex,
      pauseHistory: newPauseHistory,
    },
  }
}

// ─── Standings ─────────────────────────────────────────────────────────────

export function calculateStandings(currentStandings, round) {
  const s = {}
  Object.entries(currentStandings).forEach(([id, data]) => {
    s[id] = { ...data }
  })

  round.matches.forEach((match) => {
    const t1 = parseInt(match.team1Score) || 0
    const t2 = parseInt(match.team2Score) || 0
    match.team1.forEach((p) => {
      if (!s[p.id]) s[p.id] = { totalPoints: 0, roundsPlayed: 0 }
      s[p.id].totalPoints += t1
      s[p.id].roundsPlayed += 1
    })
    match.team2.forEach((p) => {
      if (!s[p.id]) s[p.id] = { totalPoints: 0, roundsPlayed: 0 }
      s[p.id].totalPoints += t2
      s[p.id].roundsPlayed += 1
    })
  })

  round.pausing.forEach((p) => {
    if (!s[p.id]) s[p.id] = { totalPoints: 0, roundsPlayed: 0 }
    s[p.id].totalPoints += round.pausePoints
    s[p.id].roundsPlayed += 1
  })

  return s
}

// ─── Display helpers ───────────────────────────────────────────────────────

export function getDisplayName(player, mode) {
  if (mode === 'pairs') return `${player.name1} & ${player.name2}`
  return player.name
}

export function getSortedStandings(players, standings, mode) {
  return [...players]
    .map((p) => ({
      player: p,
      name: getDisplayName(p, mode),
      totalPoints: standings[p.id]?.totalPoints ?? 0,
      roundsPlayed: standings[p.id]?.roundsPlayed ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
}
