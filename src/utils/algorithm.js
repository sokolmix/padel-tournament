// ─── Helpers ───────────────────────────────────────────────────────────────

export function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ─── Whist Tournament Tables ───────────────────────────────────────────────
//
// Matematycznie zweryfikowane tabele gwarantujące:
//   • każdy gra z każdym jako PARTNER dokładnie 1× (przez N-1 rund)
//   • każdy gra przeciwko każdemu dokładnie 2×
//
// Używane tylko gdy liczba graczy to dokładnie 8, 12 lub 16 (brak pauzujących).
//
// Format: [[t1a,t1b, t2a,t2b], ...korty] dla każdej rundy
// Indeksy odnoszą się do przetasowanej tablicy graczy (whistOrder).

// 8 graczy — 7 rund, 2 korty
const SCHEDULE_8 = [
  [[0,1,2,5], [3,6,4,7]],
  [[0,2,3,7], [1,5,4,6]],
  [[0,3,1,6], [2,7,4,5]],
  [[0,4,2,6], [1,7,3,5]],
  [[0,5,3,4], [1,2,6,7]],
  [[0,6,5,7], [1,3,2,4]],
  [[0,7,1,4], [2,3,5,6]],
]

// 12 graczy — z-cyclic construction, 11 rund, 3 korty
// Gracz o indeksie 11 jest "zakotwiczony"; pozostałe rotują: (i + r) % 11
const WHIST_SEEDS_12 = [
  [11, 0, 8, 9],
  [ 1, 7, 2, 5],
  [ 3,10, 4, 6],
]

// 16 graczy — 15 rund, 4 korty
const SCHEDULE_16 = [
  [[3,8,5,1],   [11,0,2,6],   [10,14,12,7], [13,9,4,15]],
  [[0,9,13,11], [3,10,14,8],  [15,6,2,4],   [12,5,1,7]],
  [[4,7,1,2],   [5,6,15,12],  [13,14,8,11], [3,0,9,10]],
  [[15,9,10,12],[2,11,8,1],   [3,5,6,0],    [14,7,4,13]],
  [[3,14,7,5],  [4,6,0,13],   [9,11,2,15],  [1,12,10,8]],
  [[6,12,1,4],  [3,9,11,14],  [8,13,0,10],  [2,7,5,15]],
  [[10,15,5,0], [7,13,8,2],   [1,11,14,4],  [3,6,12,9]],
  [[8,12,9,2],  [0,4,14,5],   [3,7,13,6],   [11,15,10,1]],
  [[3,11,15,7], [10,13,6,1],  [12,4,0,8],   [5,2,9,14]],
  [[13,2,5,10], [3,12,4,11],  [14,1,6,9],   [0,15,7,8]],
  [[9,8,7,6],   [15,1,14,0],  [5,4,11,10],  [3,13,2,12]],
  [[14,2,12,0], [6,10,11,7],  [3,15,1,13],  [4,8,9,5]],
  [[3,4,8,15],  [9,1,13,5],   [2,10,6,14],  [7,0,12,11]],
  [[1,0,7,9],   [3,2,10,4],   [11,5,13,12], [6,8,15,14]],
  [[12,14,15,13],[8,5,11,6],  [7,10,4,9],   [3,1,0,2]],
]

// Zwraca { schedule, cycleLen } dla danej liczby graczy lub null (fallback do Berger)
function getWhistConfig(n) {
  if (n === 8)  return { schedule: SCHEDULE_8,  cycleLen: 7 }
  if (n === 16) return { schedule: SCHEDULE_16, cycleLen: 15 }
  if (n === 12) return { schedule: null, cycleLen: 11, zCyclic: true }
  return null
}

// Buduje mecze z tabeli Whist (SCHEDULE_8 / SCHEDULE_16)
function buildFromTable(schedule, whistOrder, roundIdx) {
  const row = schedule[roundIdx % schedule.length]
  return row.map((court, c) => ({
    court: c + 1,
    team1: [whistOrder[court[0]], whistOrder[court[1]]],
    team2: [whistOrder[court[2]], whistOrder[court[3]]],
    team1Score: '', team2Score: '',
  }))
}

// Buduje mecze metodą z-cyclic (12 graczy)
function buildZCyclic(whistOrder, roundIdx) {
  const fixed = 11
  const r = roundIdx % 11
  const rot = (x) => (x === fixed ? fixed : (x + r) % fixed)
  return WHIST_SEEDS_12.map((seed, c) => ({
    court: c + 1,
    team1: [whistOrder[rot(seed[0])], whistOrder[rot(seed[1])]],
    team2: [whistOrder[rot(seed[2])], whistOrder[rot(seed[3])]],
    team1Score: '', team2Score: '',
  }))
}

// ─── Berger Circle (fallback) ──────────────────────────────────────────────
//
// Używany gdy tabela Whist nie jest dostępna (pauzujący gracze lub niestandardowa
// liczba graczy). Gwarantuje unikalnych partnerów; dobór przeciwników optymalizowany
// metodą zachłanną na podstawie historii spotkań.

function initBergerOrder(units) {
  const shuffled = shuffle([...units])
  return shuffled.length % 2 === 0 ? shuffled : [...shuffled, null]
}

function bergerSequence(units, roundIndex) {
  const n = units.length
  const r = roundIndex % (n - 1)
  const rotating = units.slice(1)
  const rotated = [...rotating.slice(r), ...rotating.slice(0, r)]
  return [units[0], ...rotated]
}

// ─── Greedy opponent optimization (Berger fallback) ───────────────────────

function oppKey(a, b) {
  return a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
}

// Wszystkie sposoby sparowania elementów w grupy po 2
function allPairings(items) {
  if (items.length === 0) return [[]]
  const [first, ...rest] = items
  const result = []
  for (let i = 0; i < rest.length; i++) {
    const remaining = [...rest.slice(0, i), ...rest.slice(i + 1)]
    for (const sub of allPairings(remaining)) {
      result.push([[first, rest[i]], ...sub])
    }
  }
  return result
}

// Suma kwadratów liczników spotkań — niższa wartość = lepszy balans
function scoreMatches(matches, opponentCounts) {
  let score = 0
  for (const { team1, team2 } of matches) {
    for (const p1 of team1) {
      for (const p2 of team2) {
        const cnt = (opponentCounts[oppKey(p1, p2)] ?? 0) + 1
        score += cnt * cnt
      }
    }
  }
  return score
}

function buildBergerMatches(seq, activeCourts, mode, opponentCounts = {}) {
  const n = seq.length

  if (mode === 'pairs') {
    return Array.from({ length: activeCourts }, (_, c) => ({
      court: c + 1,
      team1: [seq[c]],
      team2: [seq[n - 1 - c]],
      team1Score: '', team2Score: '',
    }))
  }

  // Pary partnerów z sekwencji Bergera (symetryczne)
  const partnerPairs = Array.from({ length: n / 2 }, (_, k) => [seq[k], seq[n - 1 - k]])

  // Wybierz przypisanie par do kortów minimalizujące nierówności przeciwników
  const pairings = allPairings(partnerPairs)
  let bestScore = Infinity
  let bestMatches = null

  for (const pairing of pairings) {
    const matches = pairing.map(([team1, team2], c) => ({
      court: c + 1, team1, team2, team1Score: '', team2Score: '',
    }))
    const s = scoreMatches(matches, opponentCounts)
    if (s < bestScore) { bestScore = s; bestMatches = matches }
  }
  return bestMatches
}

// ─── Main entry point ──────────────────────────────────────────────────────
//
// history: {
//   whistOrder?,   // przetasowana kolejność graczy dla tabel Whist
//   whistIndex?,   // numer rundy w bieżącym cyklu Whist
//   bergerOrder?,  // kolejność Bergera (fallback)
//   bergerIndex?,
//   pauseHistory?, // { [id]: { count, lastPausedRound } }
//   opponentCounts // { "id1|id2": number }
// }

export function generateRound(tournament, standings, roundNumber, history = {}) {
  const { type, mode, pointsPerRound, players } = tournament
  const isPairs = mode === 'pairs'
  const unitsPerCourt = isPairs ? 2 : 4
  const activeCourts = Math.floor(players.length / unitsPerCourt)
  const pausePoints = Math.ceil(pointsPerRound / 2)
  const numToPause = players.length - activeCourts * unitsPerCourt

  let {
    whistOrder, whistIndex = 0,
    bergerOrder, bergerIndex = 0,
    pauseHistory = {}, opponentCounts = {},
  } = history

  let matches = []
  let pausing = []
  let newPauseHistory = { ...pauseHistory }
  let newOpponentCounts = { ...opponentCounts }

  // Nowe zmienne stanu — domyślnie bez zmian
  let newWhistOrder = whistOrder
  let newWhistIndex = whistIndex
  let newBergerOrder = bergerOrder
  let newBergerIndex = bergerIndex

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
          team1: [playing[c * 2]], team2: [playing[c * 2 + 1]],
          team1Score: '', team2Score: '',
        })
      } else {
        const [p1, p2, p3, p4] = playing.slice(c * 4, c * 4 + 4)
        matches.push({
          court: c + 1,
          team1: [p1, p4],  // 1. + 4. — snake wyrównuje siły
          team2: [p2, p3],
          team1Score: '', team2Score: '',
        })
      }
    }

  } else {
    // ── Americano / Mexicano R1 ───────────────────────────────────────────

    // Sprawdź czy dostępna jest tabela Whist dla tej liczby graczy
    const whistConfig = !isPairs && numToPause === 0
      ? getWhistConfig(players.length)
      : null

    if (whistConfig) {
      // ── Ścieżka Whist: matematycznie idealne przypisanie ────────────────
      const { cycleLen, schedule, zCyclic } = whistConfig

      // Inicjalizacja tylko przy pierwszej rundzie
      if (!whistOrder) {
        newWhistOrder = shuffle([...players])
      }
      // Reset indeksu po zakończeniu cyklu (bez ponownego tasowania)
      if (whistIndex >= cycleLen) {
        newWhistIndex = 0
      }

      const order = newWhistOrder
      const idx   = newWhistIndex

      matches = zCyclic
        ? buildZCyclic(order, idx)
        : buildFromTable(schedule, order, idx)

      newWhistIndex = idx + 1

    } else {
      // ── Ścieżka Berger + greedy: pauzujący lub niestandardowa liczba ────

      // 1. Inicjalizuj kolejność Bergera (tylko raz)
      if (!bergerOrder) {
        bergerOrder = initBergerOrder(players)
        bergerIndex = 0
      }
      newBergerOrder = bergerOrder  // utrwal w historii (wcześniej gubione)
      const seq = bergerSequence(bergerOrder, bergerIndex)

      // 2. Wyznacz pauzujących
      if (numToPause > 0) {
        // Gdy jest dokładnie 1 pauza i BYE w sekwencji — użyj partnera BYE.
        // Berger gwarantuje że każdy trafi obok BYE dokładnie 1× na cykl,
        // więc pauzy są równe ORAZ partnerzy unikalni w całym cyklu.
        const byePos = seq.findIndex(p => p === null)
        if (byePos !== -1 && numToPause === 1) {
          const n = seq.length
          const pausingPlayer = seq[n - 1 - byePos]
          if (pausingPlayer) {
            pausing = [pausingPlayer]
            newPauseHistory[pausingPlayer.id] = {
              count: (newPauseHistory[pausingPlayer.id]?.count ?? 0) + 1,
              lastPausedRound: roundNumber,
            }
          }
        } else {
          // Fallback: fair-pause queue (np. gdy numToPause > 1)
          const sorted = [...players].sort((a, b) => {
            const ca = pauseHistory[a.id]?.count ?? 0
            const cb = pauseHistory[b.id]?.count ?? 0
            if (ca !== cb) return ca - cb
            const la = pauseHistory[a.id]?.lastPausedRound ?? -999
            const lb = pauseHistory[b.id]?.lastPausedRound ?? -999
            return la - lb
          })
          pausing = sorted.slice(0, numToPause)
          pausing.forEach(p => {
            newPauseHistory[p.id] = {
              count: (newPauseHistory[p.id]?.count ?? 0) + 1,
              lastPausedRound: roundNumber,
            }
          })
        }
      }

      // 3. Usuń BYE i pauzujących, zbuduj mecze
      const realSeq = seq.filter(p => p !== null)
      const pausingIds = new Set(pausing.map(p => p.id))
      const playingSeq = realSeq.filter(p => !pausingIds.has(p.id))

      matches = buildBergerMatches(playingSeq, activeCourts, mode, opponentCounts)

      const cycleLen = bergerOrder.length - 1
      newBergerIndex = bergerIndex + 1
      // Reset indeksu po zakończeniu cyklu (bez ponownego tasowania)
      if (newBergerIndex >= cycleLen) {
        newBergerIndex = 0
      }
    }
  }

  // Aktualizuj liczniki spotkań przeciwników
  for (const match of matches) {
    for (const p1 of match.team1) {
      for (const p2 of match.team2) {
        const key = oppKey(p1, p2)
        newOpponentCounts[key] = (newOpponentCounts[key] ?? 0) + 1
      }
    }
  }

  return {
    roundNumber,
    matches,
    pausing,
    pausePoints,
    updatedHistory: {
      whistOrder:     newWhistOrder,
      whistIndex:     newWhistIndex,
      bergerOrder:    newBergerOrder,
      bergerIndex:    newBergerIndex,
      pauseHistory:   newPauseHistory,
      opponentCounts: newOpponentCounts,
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
