
import React, { useState, useMemo, useEffect } from 'react';
import { Player, Gender, Court, MatchHistory } from './types';
import AddPlayerForm from './components/AddPlayerForm';
import PlayerList from './components/PlayerList';
import CourtCard from './components/CourtCard';
import MatchQueue from './components/MatchQueue';
import MatchHistoryList from './components/MatchHistoryList';
import QuickImportModal from './components/QuickImportModal';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  // --- Initialize State from LocalStorage ---

  const [isSessionActive, setIsSessionActive] = useState(() => {
    return localStorage.getItem('shuttle_session_active') === 'true';
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('shuttle_players');
    return saved ? JSON.parse(saved) : [];
  });

  const [courts, setCourts] = useState<Court[]>(() => {
    const saved = localStorage.getItem('shuttle_courts');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: '場地 A', players: [], isActive: false },
      { id: '2', name: '場地 B', players: [], isActive: false }
    ];
  });

  const [matchQueue, setMatchQueue] = useState<string[][]>(() => {
    const saved = localStorage.getItem('shuttle_queue');
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState<MatchHistory[]>(() => {
    const saved = localStorage.getItem('shuttle_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [matchCount, setMatchCount] = useState(() => {
    const saved = localStorage.getItem('shuttle_match_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isScheduling, setIsScheduling] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [resetStep, setResetStep] = useState(0);

  // 自動廣播開關狀態
  const [isAutoBroadcastEnabled, setIsAutoBroadcastEnabled] = useState(() => {
    const saved = localStorage.getItem('isAutoBroadcastEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // --- Persistence Effects ---

  useEffect(() => {
    localStorage.setItem('shuttle_session_active', String(isSessionActive));
  }, [isSessionActive]);

  useEffect(() => {
    if (isSessionActive) {
      localStorage.setItem('shuttle_players', JSON.stringify(players));
    }
  }, [players, isSessionActive]);

  useEffect(() => {
    if (isSessionActive) {
      localStorage.setItem('shuttle_courts', JSON.stringify(courts));
    }
  }, [courts, isSessionActive]);

  useEffect(() => {
    if (isSessionActive) {
      localStorage.setItem('shuttle_queue', JSON.stringify(matchQueue));
    }
  }, [matchQueue, isSessionActive]);

  useEffect(() => {
    if (isSessionActive) {
      localStorage.setItem('shuttle_history', JSON.stringify(history));
    }
  }, [history, isSessionActive]);

  useEffect(() => {
    if (isSessionActive) {
      localStorage.setItem('shuttle_match_count', String(matchCount));
    }
  }, [matchCount, isSessionActive]);

  useEffect(() => {
    localStorage.setItem('isAutoBroadcastEnabled', JSON.stringify(isAutoBroadcastEnabled));
  }, [isAutoBroadcastEnabled]);

  useEffect(() => {
    if (resetStep === 1) {
      const timer = setTimeout(() => setResetStep(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [resetStep]);

  // --- Derived State ---

  const playingPlayerIds = useMemo(() => {
    return new Set(courts.flatMap(c => c.players).filter(id => id !== ""));
  }, [courts]);

  const queuedPlayerIds = useMemo(() => {
    return new Set(matchQueue.flat().filter(id => id !== ""));
  }, [matchQueue]);

  const busyPlayerIds = useMemo(() => {
    const all = new Set<string>();
    playingPlayerIds.forEach(id => all.add(id));
    queuedPlayerIds.forEach(id => all.add(id));
    return all;
  }, [playingPlayerIds, queuedPlayerIds]);

  // --- Handlers ---

  const handleStartSession = () => {
    setIsSessionActive(true);
  };

  const handleEndSession = () => {
    if (resetStep === 0) {
      setResetStep(1);
    } else {
      // Clear Session Data
      localStorage.removeItem('shuttle_players');
      localStorage.removeItem('shuttle_courts');
      localStorage.removeItem('shuttle_queue');
      localStorage.removeItem('shuttle_history');
      localStorage.removeItem('shuttle_match_count');

      // Reset State
      setPlayers([]);
      setHistory([]);
      setMatchCount(0);
      setMatchQueue([]);
      setCourts([
        { id: '1', name: '場地 A', players: [], isActive: false },
        { id: '2', name: '場地 B', players: [], isActive: false }
      ]);

      setIsSessionActive(false);
      setResetStep(0);
    }
  };

  // Deprecated: Old handleReset replaced by handleEndSession
  // keeping logic just in case, but mapped to End Session button

  const addPlayer = (newPlayer: Omit<Player, 'id' | 'gamesPlayed'>) => {
    const player: Player = { ...newPlayer, id: crypto.randomUUID(), gamesPlayed: 0 };
    setPlayers(prev => [...prev, player]);
  };

  const bulkAddPlayers = (newPlayers: Omit<Player, 'id' | 'gamesPlayed'>[]) => {
    const formatted = newPlayers.map(p => ({ ...p, id: crypto.randomUUID(), gamesPlayed: 0 }));
    setPlayers(prev => [...prev, ...formatted]);
  };

  const updatePlayerLevel = (id: string, newLevel: number) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, level: Math.max(1, Math.min(15, newLevel)) } : p));
  };

  const deletePlayer = (id: string) => {
    if (busyPlayerIds.has(id)) {
      alert("該球友正在比賽或排隊中，請先從名單移除再刪除！");
      return;
    }
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const addCourt = () => {
    const newCourt: Court = {
      id: crypto.randomUUID(),
      name: `場地 ${String.fromCharCode(64 + courts.length + 1)}`,
      players: [],
      isActive: false
    };
    setCourts(prev => [...prev, newCourt]);
  };

  const removeCourt = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (court?.isActive) {
      alert("請先結束該場地比賽後再刪除！");
      return;
    }
    setCourts(prev => prev.filter(c => c.id !== courtId));
  };

  const updateCourtName = (id: string, newName: string) => {
    setCourts(prev => prev.map(c => c.id === id ? { ...c, name: newName || c.name } : c));
  };

  const replayBroadcast = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (!court || !court.isActive || court.players.length === 0) return;
    const names = players.filter(p => court.players.includes(p.id)).map(p => p.name);
    geminiService.broadcastAnnouncement(names, court.name);
  };

  const endMatch = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return;

    const validPlayers = court.players.filter(id => id !== "");
    if (validPlayers.length === 4) {
      const currentMatch: MatchHistory = {
        timestamp: Date.now(),
        players: [...court.players],
        teams: [[court.players[0], court.players[1]], [court.players[2], court.players[3]]]
      };
      setHistory(prev => [...prev, currentMatch]);
      setPlayers(prev => prev.map(p => court.players.includes(p.id) ? { ...p, gamesPlayed: p.gamesPlayed + 1 } : p));
      setMatchCount(prev => prev + 1);
    }

    setCourts(prev => prev.map(c => c.id === courtId ? { ...c, players: [], isActive: false } : c));
  };

  const assignMatchToCourt = (courtId: string, queueIndex: number = 0) => {
    if (matchQueue.length <= queueIndex) return;

    const nextMatch = matchQueue[queueIndex];
    const newQueue = matchQueue.filter((_, i) => i !== queueIndex);

    setMatchQueue(newQueue);
    setCourts(prev => prev.map(c => {
      if (c.id === courtId) {
        const courtName = c.name;
        const playerNames = players.filter(p => nextMatch.includes(p.id)).map(p => p.name);
        if (playerNames.length > 0 && isAutoBroadcastEnabled) {
          geminiService.broadcastAnnouncement(playerNames, courtName);
        }
        return { ...c, players: nextMatch, isActive: true, startTime: Date.now() };
      }
      return c;
    }));
  };

  const autoAssignAllEmptyCourts = () => {
    const availableCourts = courts.filter(c => !c.isActive);
    if (availableCourts.length === 0 || matchQueue.length === 0) return;

    let currentQueue = [...matchQueue];
    let updatedCourts = [...courts];
    let assignedCount = 0;

    for (let i = 0; i < updatedCourts.length; i++) {
      if (!updatedCourts[i].isActive && currentQueue.length > 0) {
        const nextMatch = currentQueue.shift()!;
        const courtName = updatedCourts[i].name;

        updatedCourts[i] = {
          ...updatedCourts[i],
          players: nextMatch,
          isActive: true,
          startTime: Date.now()
        };

        assignedCount++;
        const playerNames = players.filter(p => nextMatch.includes(p.id)).map(p => p.name);
        if (playerNames.length > 0 && isAutoBroadcastEnabled) {
          geminiService.broadcastAnnouncement(playerNames, courtName);
        }
      }
    }

    if (assignedCount > 0) {
      setMatchQueue(currentQueue);
      setCourts(updatedCourts);
    }
  };

  /**
   * --- 核心演算法：本地智慧排點 (極致平衡場次版) ---
   */
  // ... (keep generateSmartRound exactly as is, but it's inside component, so we just use the existing one)
  const generateSmartRound = (currentPlayers: Player[], currentHistory: MatchHistory[], queueSoFar: string[][]): string[] | null => {
    // 智慧排點不再排除正在場上的球員，而是將他們一併納入考量
    // 但會透過 projectedGames 增加場次權重，避免他們如果正在打，還被排在很前面
    const available = currentPlayers;
    if (available.length < 4) return null;

    const projectedGames = new Map<string, number>();
    currentPlayers.forEach(p => {
      // 如果正在場上，視為已經打完這場 (+1)，避免優先級過高
      // 如果還在隊列中，下面會再加
      const baseGames = p.gamesPlayed + (playingPlayerIds.has(p.id) ? 1 : 0);
      projectedGames.set(p.id, baseGames);
    });
    queueSoFar.forEach(match => {
      match.forEach(id => {
        if (id && projectedGames.has(id)) {
          projectedGames.set(id, projectedGames.get(id)! + 1);
        }
      });
    });

    const sortedByGames = [...available].sort((a, b) => {
      const gA = projectedGames.get(a.id)!;
      const gB = projectedGames.get(b.id)!;
      if (gA !== gB) return gA - gB;
      return Math.random() - 0.5;
    });

    const selectedPlayers = sortedByGames.slice(0, 4);
    const sIds = selectedPlayers.map(p => p.id);

    const combinations = [
      [[sIds[0], sIds[1]], [sIds[2], sIds[3]]],
      [[sIds[0], sIds[2]], [sIds[1], sIds[3]]],
      [[sIds[0], sIds[3]], [sIds[1], sIds[2]]]
    ];

    let bestCombination = combinations[0];
    let minPenalty = Infinity;
    const recentHistory = currentHistory.slice(-25);

    combinations.forEach(comb => {
      let penalty = 0;
      const team1Ids = comb[0];
      const team2Ids = comb[1];
      const lv1 = (selectedPlayers.find(p => p.id === team1Ids[0])?.level || 0) + (selectedPlayers.find(p => p.id === team1Ids[1])?.level || 0);
      const lv2 = (selectedPlayers.find(p => p.id === team2Ids[0])?.level || 0) + (selectedPlayers.find(p => p.id === team2Ids[1])?.level || 0);
      penalty += Math.abs(lv1 - lv2) * 2;
      recentHistory.forEach(h => {
        h.teams.forEach(t => {
          if (t.includes(team1Ids[0]) && t.includes(team1Ids[1])) penalty += 15;
          if (t.includes(team2Ids[0]) && t.includes(team2Ids[1])) penalty += 15;
        });
      });
      queueSoFar.forEach(m => {
        if ((m[0] === team1Ids[0] && m[1] === team1Ids[1]) || (m[0] === team1Ids[1] && m[1] === team1Ids[0])) penalty += 20;
        if ((m[2] === team2Ids[0] && m[3] === team2Ids[1]) || (m[2] === team2Ids[1] && m[3] === team2Ids[0])) penalty += 20;
      });
      recentHistory.forEach(h => {
        const hT1 = h.teams[0];
        const hT2 = h.teams[1];
        const isOpponentInHistory = (hT1.includes(team1Ids[0]) && hT2.includes(team2Ids[0])) ||
          (hT1.includes(team1Ids[0]) && hT2.includes(team2Ids[1])) ||
          (hT2.includes(team1Ids[0]) && hT1.includes(team2Ids[0])) ||
          (hT2.includes(team1Ids[0]) && hT1.includes(team2Ids[1]));
        if (isOpponentInHistory) penalty += 5;
      });
      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestCombination = comb;
      }
    });
    return [...bestCombination[0], ...bestCombination[1]];
  };

  const scheduleQueue = async (roundsRequested: number = 5) => {
    if (players.length < 4) {
      alert("人數不足 4 人。");
      return;
    }
    setIsScheduling(true);
    try {
      const candidatePlayers = players.filter(p => !playingPlayerIds.has(p.id));
      const suggestedRounds = await geminiService.suggestPairings(candidatePlayers, history, roundsRequested, matchQueue);
      if (suggestedRounds.length > 0) setMatchQueue(prev => [...prev, ...suggestedRounds]);
    } catch (error: any) {
      if (error.message && error.message.includes("API Key is missing")) {
        alert("請先設定 Gemini API Key 才能使用 AI 排點功能！");
      } else {
        alert("AI 排點失敗");
      }
    } finally {
      setIsScheduling(false);
    }
  };

  const normalScheduleQueue = (roundsRequested: number = 5) => {
    if (players.length < 4) return;
    const newRounds: string[][] = [];
    let currentQueueState = [...matchQueue];
    for (let i = 0; i < roundsRequested; i++) {
      const round = generateSmartRound(players, history, currentQueueState);
      if (round) {
        newRounds.push(round);
        currentQueueState.push(round);
      }
    }
    setMatchQueue(prev => [...prev, ...newRounds]);
  };

  const addBlankMatch = () => {
    setMatchQueue(prev => [...prev, ["", "", "", ""]]);
  };

  const manualScheduleQueue = () => {
    const round = generateSmartRound(players, history, matchQueue);
    if (round) setMatchQueue(prev => [...prev, round]);
  };

  const reorderQueue = (index: number, direction: 'up' | 'down') => {
    setMatchQueue(prev => {
      const next = [...prev];
      const target = index + (direction === 'up' ? -1 : 1);
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeFromQueue = (index: number) => {
    setMatchQueue(prev => prev.filter((_, i) => i !== index));
  };

  const swapQueuePlayer = (qIdx: number, oldId: string, newId: string) => {
    setMatchQueue(prev => {
      const next = [...prev];
      const round = [...next[qIdx]];
      let targetPos = -1;
      if (oldId === "") {
        targetPos = round.findIndex((id, idx) => id === "" && idx === (window as any)._lastPIdx);
        if (targetPos === -1) targetPos = round.indexOf("");
      } else {
        targetPos = round.indexOf(oldId);
      }
      if (targetPos === -1) return prev;
      const existingIdx = round.indexOf(newId);
      if (existingIdx !== -1) {
        round[existingIdx] = oldId;
        round[targetPos] = newId;
      } else {
        round[targetPos] = newId;
      }
      next[qIdx] = round;
      return next;
    });
  };

  const swapActivePlayer = (courtId: string, oldId: string, newId: string) => {
    setCourts(prev => prev.map(c => {
      if (c.id !== courtId) return c;
      const nextP = [...c.players];
      const oIdx = nextP.indexOf(oldId);
      const tIdx = nextP.indexOf(newId);
      if (tIdx !== -1) {
        nextP[oIdx] = newId;
        nextP[tIdx] = oldId;
      } else {
        nextP[oIdx] = newId;
      }
      return { ...c, players: nextP };
    }));
  };

  if (!isSessionActive) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-lg">
          <h1 className="text-6xl font-black bg-gradient-to-br from-indigo-400 to-purple-500 bg-clip-text text-transparent italic tracking-tighter">
            SHUTTLE MASTER AI
          </h1>
          <p className="text-slate-400 text-lg">智慧羽球排點助手，讓每一場對局都精彩。</p>

          <button
            onClick={handleStartSession}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-xl font-bold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 hover:bg-indigo-700 hover:scale-105"
          >
            開始本次活動 (Start Session)
            <div className="absolute -inset-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 opacity-20 group-hover:opacity-40 blur-lg transition-opacity duration-200" />
          </button>

          <p className="text-slate-600 text-sm">
            點擊開始後，系統將會自動保存您的所有名單與排程紀錄，<br />即使重新整理網頁也不會遺失，直到您點選「結束活動」。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-[1700px]">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-br from-indigo-600 to-blue-500 bg-clip-text text-transparent italic tracking-tighter">
              SHUTTLE MASTER AI
            </h1>
            <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">Centralized Smart Queue System</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* 語音廣播開關 */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border-2 border-slate-100 shadow-sm transition-all hover:border-indigo-200">
              <div className={`p-1.5 rounded-lg transition-colors ${isAutoBroadcastEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                {isAutoBroadcastEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A9.954 9.954 0 0019 10a9.972 9.972 0 00-2.929-7.071 1 1 0 00-1.414 1.414A7.971 7.971 0 0117 10c0 1.258-.29 2.448-.807 3.507l-1.456-1.456A5.982 5.982 0 0015 10a5.983 5.983 0 00-1.757-4.243 1 1 0 00-1.415 1.415A3.983 3.983 0 0113 10c0 .64-.15 1.245-.417 1.783L3.707 2.293zM10 4v3.293L6.707 4H10z" clipRule="evenodd" /><path d="M10 16v-3.293l3.293 3.293H10zM1.707 15.293l14-14L14.293 2.707l-14 14 1.414 1.414z" /></svg>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 leading-none mb-0.5">自動廣播</span>
                <span className={`text-[11px] font-bold leading-none ${isAutoBroadcastEnabled ? 'text-indigo-600' : 'text-slate-500'}`}>
                  {isAutoBroadcastEnabled ? '已開啟' : '已關閉'}
                </span>
              </div>
              <button
                onClick={() => setIsAutoBroadcastEnabled(!isAutoBroadcastEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAutoBroadcastEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAutoBroadcastEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden px-4 py-2 rounded-2xl font-bold bg-white text-indigo-600 shadow-sm border-2 border-indigo-100 hover:bg-indigo-50 transition-all text-sm flex items-center gap-2"
            >
              👥 球員
            </button>

            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-4 py-2 rounded-2xl font-bold bg-white text-slate-600 shadow-sm border-2 border-slate-200 hover:border-slate-400 hover:text-slate-800 transition-all text-sm flex items-center gap-2"
            >
              📜 歷史
            </button>
            {/* ... other buttons ... */}
            <button
              onClick={handleEndSession}
              className={`px-4 py-2 rounded-2xl font-black transition-all shadow-sm text-sm border-2 ${resetStep === 0
                ? 'bg-white border-slate-200 text-slate-400 hover:border-red-400 hover:text-red-500'
                : 'bg-red-500 border-red-600 text-white animate-pulse'
                }`}
            >
              {resetStep === 0 ? '結束' : '確定？'}
            </button>
            <button onClick={() => setShowImportModal(true)} className="hidden lg:flex bg-indigo-50 border-2 border-indigo-200 text-indigo-600 px-6 py-2 rounded-2xl font-black hover:bg-indigo-100 transition-all shadow-sm items-center gap-2">匯入球友</button>
            <button onClick={addCourt} className="bg-white border-2 border-indigo-600 text-indigo-600 px-6 py-2 rounded-2xl font-black hover:bg-indigo-600 hover:text-white transition-all shadow-sm">＋ 場地</button>
            <div className="bg-slate-800 text-white px-2 py-3 rounded-2xl flex flex-col items-center justify-center shadow-xl w-16">
              <span className="text-[8px] font-bold opacity-60 uppercase tracking-widest leading-none">Games</span>
              <span className="text-xl font-black leading-none">{matchCount}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative">
          {/* Mobile Sidebar Overlay */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden animate-in fade-in"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* Left Column: Player Management (Sidebar on Mobile) */}
          <div className={`
            lg:col-span-3 flex flex-col gap-6 h-full min-h-[850px] transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? 'fixed inset-0 z-50 w-full bg-slate-100 p-4 shadow-2xl overflow-y-auto' : 'hidden lg:flex'}
          `}>
            <div className="lg:hidden flex justify-between items-center mb-2">
              <h3 className="font-black text-xl text-slate-800">👥 球員管理</h3>
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold">✕</button>
            </div>
            <AddPlayerForm onAdd={addPlayer} />
            <PlayerList
              players={players}
              courts={courts}
              matchQueue={matchQueue}
              history={history}
              playingPlayerIds={playingPlayerIds}
              queuedPlayerIds={queuedPlayerIds}
              onDelete={deletePlayer}
              onUpdateLevel={updatePlayerLevel}
            />
            <div className="lg:hidden pt-8 pb-20">
              <button onClick={() => setShowImportModal(true)} className="w-full bg-indigo-100 text-indigo-700 py-3 rounded-xl font-bold">批次匯入球員</button>
            </div>
          </div>

          <div className={`lg:col-span-6 grid ${courts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} md:grid-cols-2 gap-2 md:gap-6`}>
            {courts.map(court => (
              <CourtCard
                key={court.id}
                court={court}
                allPlayers={players}
                busyPlayerIds={busyPlayerIds}
                playingPlayerIds={playingPlayerIds}
                onEndMatch={endMatch}
                onSwapPlayer={swapActivePlayer}
                onReplayBroadcast={replayBroadcast}
                onRemoveCourt={removeCourt}
                onUpdateName={updateCourtName}
                matchQueueCount={matchQueue.length}
                onAssignNext={() => assignMatchToCourt(court.id, 0)}
              />
            ))}
          </div>

          <div className="lg:col-span-3 flex flex-col gap-6 h-full min-h-[850px]">
            <MatchQueue
              queue={matchQueue}
              allPlayers={players}
              history={history}
              busyPlayerIds={busyPlayerIds}
              playingPlayerIds={playingPlayerIds}
              onSchedule={scheduleQueue}
              onNormalSchedule={normalScheduleQueue}
              onAddBlankMatch={addBlankMatch}
              onManualSchedule={manualScheduleQueue}
              onRemove={removeFromQueue}
              onReorder={reorderQueue}
              onSwapPlayer={swapQueuePlayer}
              isScheduling={isScheduling}
              availableCourts={courts.filter(c => !c.isActive)}
              onAssignToCourt={assignMatchToCourt}
              onAutoAssignAll={autoAssignAllEmptyCourts}
            />
          </div>
        </div>
      </div>

      {showImportModal && (
        <QuickImportModal onClose={() => setShowImportModal(false)} onImport={bulkAddPlayers} />
      )}

      {showHistoryModal && (
        <MatchHistoryList
          history={history}
          allPlayers={players}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      `}</style>
    </div>
  );
};

export default App;
