
import React, { useState, useMemo, useEffect } from 'react';
import { Player, Gender, Court, MatchHistory, UserProfile } from './types';
import AddPlayerForm from './components/AddPlayerForm';
import PlayerList from './components/PlayerList';
import CourtCard from './components/CourtCard';
import MatchQueue from './components/MatchQueue';
import MatchHistoryList from './components/MatchHistoryList';
import QuickImportModal from './components/QuickImportModal';
import ScoreInputModal from './components/ScoreInputModal';
import LoginScreen from './components/LoginScreen';
import { lineService } from './services/lineService';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  // --- Initialize State from LocalStorage ---

  const [isSessionActive, setIsSessionActive] = useState(() => {
    return localStorage.getItem('shuttle_session_active') === 'true';
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('shuttle_master_user');
    return saved ? JSON.parse(saved) : null;
  });

  // --- LIFF & Login Logic ---
  const [inPopupMode, setInPopupMode] = useState(false);

  useEffect(() => {
    const initLiff = async () => {
      // Check if we are in "Popup Callback Mode"
      const params = new URLSearchParams(window.location.search);
      const isPopupMode = params.get('liff.state') || window.location.search.includes('line_login_check');

      if (isPopupMode) {
        setInPopupMode(true);
      }

      try {
        const isLoggedIn = await lineService.init();

        // 1. Popup Logic
        if (isPopupMode) {
          if (isLoggedIn) {
            // Success! Send back to opener
            const profile = await lineService.getProfile();
            if (window.opener) {
              window.opener.postMessage({ type: 'LINE_LOGIN_SUCCESS', user: profile }, window.location.origin);
              window.close();
            }
          } else {
            // Not logged in yet? Redirect to LINE Login immediately inside the popup
            // IMPORTANT: Pass clean redirect URI with our check param
            const cleanRedirectUri = window.location.origin + '?line_login_check=true';
            lineService.login(cleanRedirectUri);
          }
          return;
        }

        // 2. Main App Logic
        if (isLoggedIn) {
          const profile = await lineService.getProfile(); // Fetch actual profile from LIFF
          if (profile) {
            setCurrentUser(profile);
            localStorage.setItem('shuttle_master_user', JSON.stringify(profile));
            // Sync with current players
            setPlayers(prev => {
              if (!prev.some(p => p.id === profile.userId)) {
                return [...prev, {
                  id: profile.userId,
                  name: profile.displayName,
                  level: 5,
                  gender: Gender.MALE, // Default
                  gamesPlayed: 0
                }];
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error("LIFF Init Error:", error);
        if (isPopupMode) window.close(); // Close if error in popup
      }
    };
    initLiff();

    // Listener for PWA (Main Window) to receive login data from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'LINE_LOGIN_SUCCESS' && event.data?.user) {
        const profile = event.data.user;
        setCurrentUser(profile);
        localStorage.setItem('shuttle_master_user', JSON.stringify(profile));
        setPlayers(prev => {
          if (!prev.some(p => p.id === profile.userId)) {
            return [...prev, {
              id: profile.userId,
              name: profile.displayName,
              level: 5,
              gender: Gender.MALE,
              gamesPlayed: 0
            }];
          }
          return prev;
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // If in popup mode, just render a loading screen to avoid double app logic
  if (inPopupMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold">Connecting to LINE...</p>
      </div>
    );
  }

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

  // 計分功能狀態
  const [isScoreEnabled, setIsScoreEnabled] = useState(() => {
    const saved = localStorage.getItem('isScoreEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [endingCourtId, setEndingCourtId] = useState<string | null>(null);

  // 自動廣播開關狀態
  const [isAutoBroadcastEnabled, setIsAutoBroadcastEnabled] = useState(() => {
    const saved = localStorage.getItem('isAutoBroadcastEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('shuttle_master_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    if (window.confirm('確定要登出嗎？')) {
      lineService.logout(); // LIFF Logout
      setCurrentUser(null);
      localStorage.removeItem('shuttle_master_user');
      window.location.reload(); // Reload to reset LIFF state/ensure clean slate
    }
  };

  // --- Persistence Effects ---

  useEffect(() => {
    localStorage.setItem('shuttle_session_active', String(isSessionActive));
  }, [isSessionActive]);

  useEffect(() => {
    localStorage.setItem('isScoreEnabled', JSON.stringify(isScoreEnabled));
  }, [isScoreEnabled]);

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



  // Helper functions
  const getPlayer = (id: string) => players.find(p => p.id === id);

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
    return new Set(courts.filter(c => c.isActive).flatMap(c => c.players).filter(id => id !== ""));
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
    if (isScoreEnabled) {
      setEndingCourtId(courtId);
    } else {
      finalizeMatch(courtId);
    }
  };

  const finalizeMatch = (courtId: string, score?: [number, number]) => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return;

    const validPlayers = court.players.filter(id => id !== "");
    if (validPlayers.length === 4) {
      const startTime = court.startTime || Date.now();
      const endTime = Date.now();
      const durationSeconds = Math.round((endTime - startTime) / 1000);

      const currentMatch: MatchHistory = {
        timestamp: endTime,
        players: [...court.players],
        teams: [[court.players[0], court.players[1]], [court.players[2], court.players[3]]],
        duration: durationSeconds,
        score: score
      };
      setHistory(prev => [...prev, currentMatch]);
      setPlayers(prev => prev.map(p => court.players.includes(p.id) ? { ...p, gamesPlayed: p.gamesPlayed + 1 } : p));
      setMatchCount(prev => prev + 1);
    }

    setCourts(prev => prev.map(c => c.id === courtId ? { ...c, players: [], isActive: false } : c));
    setEndingCourtId(null);
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

    let updatedQueue = [...matchQueue];
    let updatedCourts = [...courts];
    let assignedCount = 0;

    // Set of players currently playing OR assigned in this batch
    const busyIds = new Set(playingPlayerIds);

    for (let i = 0; i < updatedCourts.length; i++) {
      // Only target currently available courts
      if (!updatedCourts[i].isActive) {
        // Find the first valid match in the queue
        const validMatchIndex = updatedQueue.findIndex(match =>
          !match.some(id => busyIds.has(id))
        );

        if (validMatchIndex !== -1) {
          const matchToAssign = updatedQueue[validMatchIndex];

          // Remove from queue
          updatedQueue.splice(validMatchIndex, 1);

          // Mark players as busy for subsequent iterations in this loop
          matchToAssign.forEach(id => busyIds.add(id));

          // Assign to court
          updatedCourts[i] = {
            ...updatedCourts[i],
            players: matchToAssign,
            isActive: true,
            startTime: Date.now()
          };

          assignedCount++;

          const playerNames = players.filter(p => matchToAssign.includes(p.id)).map(p => p.name);
          if (playerNames.length > 0 && isAutoBroadcastEnabled) {
            geminiService.broadcastAnnouncement(playerNames, updatedCourts[i].name);
          }
        }
      }
    }

    if (assignedCount > 0) {
      setMatchQueue(updatedQueue);
      setCourts(updatedCourts);

      if (assignedCount < availableCourts.length) {
        alert(`已指派 ${assignedCount} 場比賽。部分場地因球員忙碌或佇列不足而未指派。`);
      }
    } else {
      alert("佇列中所有對戰的球員似乎都正在忙碌中，無法自動指派。");
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
    // Advanced Swap: Check for duplicates in other rounds
    const existingIndices: number[] = [];
    matchQueue.forEach((m, idx) => {
      if (idx !== qIdx && m.includes(newId)) {
        existingIndices.push(idx + 1);
      }
    });

    let targetSwapIdx = -1;

    if (existingIndices.length > 0) {
      const roundsStr = existingIndices.map(i => `Round ${i}`).join(', ');
      const choice = window.prompt(
        `球員已排在 ${roundsStr}。\n\n` +
        `1. 輸入場次號碼 (如 ${existingIndices[0]}) 進行「交換位置」\n` +
        `2. 留空並按確定，進行「直接替換」(可能導致重複)\n` +
        `3. 按取消由不執行`
      );

      if (choice === null) return; // Cancelled

      if (choice.trim() !== "") {
        const parsed = parseInt(choice);
        if (existingIndices.includes(parsed)) {
          targetSwapIdx = parsed - 1;
        } else {
          alert("輸入的場次錯誤，操作已取消。");
          return;
        }
      }
    }

    setMatchQueue(prev => {
      const next = [...prev];
      const round = [...next[qIdx]];
      let targetPos = -1;

      // Determine position of oldId (or blank) in current match
      if (oldId === "") {
        targetPos = round.findIndex((id, idx) => id === "" && idx === (window as any)._lastPIdx);
        if (targetPos === -1) targetPos = round.indexOf("");
      } else {
        targetPos = round.indexOf(oldId);
      }

      if (targetPos === -1) return prev;

      // Check if newId is already IN THE SAME ROUND
      const existingIdx = round.indexOf(newId);
      if (existingIdx !== -1) {
        // Swap within same round
        round[existingIdx] = oldId;
        round[targetPos] = newId;
        next[qIdx] = round;
      } else if (targetSwapIdx !== -1) {
        // Swap WITH another match (Cross-Round Swap)
        const targetRound = [...next[targetSwapIdx]];
        const targetInnerIdx = targetRound.indexOf(newId);

        if (targetInnerIdx !== -1) {
          // Perform the swap
          round[targetPos] = newId;          // Put newId here
          targetRound[targetInnerIdx] = oldId; // Put oldId there

          next[qIdx] = round;
          next[targetSwapIdx] = targetRound;
        } else {
          // Should not happen, but fallback
          round[targetPos] = newId;
          next[qIdx] = round;
        }
      } else {
        // Standard Replacement (Direct)
        round[targetPos] = newId;
        next[qIdx] = round;
      }

      return next;
    });
  };

  const swapActivePlayer = (courtId: string, oldId: string, newId: string) => {
    // Advanced Swap (Active <-> Queue)
    // Check if newId is in the queue
    const existingIndices: number[] = [];
    matchQueue.forEach((m, idx) => {
      if (m.includes(newId)) {
        existingIndices.push(idx + 1);
      }
    });

    let targetQueueIdx = -1;

    if (existingIndices.length > 0) {
      const roundsStr = existingIndices.map(i => `Round ${i}`).join(', ');
      const choice = window.prompt(
        `球員已排在 ${roundsStr}。\n\n` +
        `1. 輸入場次號碼 (如 ${existingIndices[0]}) 進行「交換位置」\n` +
        `2. 留空並按確定，進行「直接替換」(此人將同時在場上與隊列中)\n` +
        `3. 按取消由不執行`
      );

      if (choice === null) return; // Cancelled

      if (choice.trim() !== "") {
        const parsed = parseInt(choice);
        if (existingIndices.includes(parsed)) {
          targetQueueIdx = parsed - 1;
        } else {
          alert("輸入的場次錯誤，操作已取消。");
          return;
        }
      }
    }

    // 1. Update Court
    setCourts(prev => prev.map(c => {
      if (c.id !== courtId) return c;
      const nextP = [...c.players];
      const oIdx = nextP.indexOf(oldId);
      const tIdx = nextP.indexOf(newId);

      if (tIdx !== -1) {
        // Swap within same court (rare but possible)
        nextP[oIdx] = newId;
        nextP[tIdx] = oldId;
      } else {
        // Replace oldId with newId
        nextP[oIdx] = newId;
      }
      return { ...c, players: nextP };
    }));

    // 2. If Cross-Swap, Update Queue
    if (targetQueueIdx !== -1) {
      setMatchQueue(prev => {
        const next = [...prev];
        const round = [...next[targetQueueIdx]];
        const tIdx = round.indexOf(newId);
        if (tIdx !== -1) {
          round[tIdx] = oldId; // Put the player leaving the court into the queue
          next[targetQueueIdx] = round;
        }
        return next;
      });
    }
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (!isSessionActive) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-lg">
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {currentUser.pictureUrl ? (
              <img src={currentUser.pictureUrl} alt={currentUser.displayName} className="w-20 h-20 rounded-full border-4 border-white shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-500 flex items-center justify-center text-3xl text-white font-bold shadow-lg">
                {currentUser.displayName.charAt(0)}
              </div>
            )}
            <div className="text-center">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">WELCOME BACK</p>
              <h2 className="text-2xl font-black text-white">{currentUser.displayName}</h2>
            </div>
          </div>

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
          <div className="flex items-center gap-4">
            {/* Use Avatar */}
            {currentUser.pictureUrl ? (
              <img src={currentUser.pictureUrl} alt={currentUser.displayName} className="w-12 h-12 rounded-full border-2 border-white shadow-md hidden md:block" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-500 hidden md:flex items-center justify-center text-xl text-white font-bold shadow-md">
                {currentUser.displayName.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-br from-indigo-600 to-blue-500 bg-clip-text text-transparent italic tracking-tighter">
                SHUTTLE MASTER AI
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">Centralized Smart Queue System</p>
                <span className="hidden md:inline-block w-1 h-1 bg-slate-300 rounded-full"></span>
                <p className="hidden md:block text-slate-500 text-xs font-bold">Hi, {currentUser.displayName}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* 計分模式開關 */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border-2 border-slate-100 shadow-sm transition-all hover:border-amber-200">
              <div className={`p-1.5 rounded-lg transition-colors ${isScoreEnabled ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.535 5.503a1 1 0 101.07 1.683c.852-.54 2.117-.824 3.465-.824s2.613.284 3.465.824a1 1 0 001.07-1.683C14.306 13.05 12.585 12.5 10.5 12.5s-3.806.55-5.035 1.503z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 leading-none mb-0.5">計分模式</span>
                <span className={`text-[11px] font-bold leading-none ${isScoreEnabled ? 'text-amber-600' : 'text-slate-500'}`}>
                  {isScoreEnabled ? '已開啟' : '已關閉'}
                </span>
              </div>
              <button
                onClick={() => setIsScoreEnabled(!isScoreEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isScoreEnabled ? 'bg-amber-500' : 'bg-slate-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isScoreEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

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
              onClick={handleLogout}
              className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-2xl border-2 border-slate-100 shadow-sm transition-all hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-500"
              title="登出"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
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
                nextMatch={matchQueue[0]} // For visual indication
                onAssignNext={() => {
                  const validIndex = matchQueue.findIndex(match => !match.some(id => playingPlayerIds.has(id)));

                  if (validIndex === -1) {
                    // Try to suggest a Smart Swap with *Queued* players (Fairness + Level Balance)
                    const topMatch = matchQueue[0];
                    const busyInTop = topMatch.filter(id => playingPlayerIds.has(id));

                    if (busyInTop.length > 0) {
                      // Find candidates from *subsequent* matches in the queue
                      const swaps: { busyId: string, targetId: string, matchIndex: number, matchPlayerIndex: number }[] = [];
                      const usedTargetIds = new Set<string>();

                      // Try to find a swap for each busy player
                      for (const busyId of busyInTop) {
                        const busyPlayer = players.find(p => p.id === busyId);
                        if (!busyPlayer) continue;

                        let bestCandidate: { id: string, matchIndex: number, playerIndex: number, score: number } | null = null;

                        // Search matches starting from index 1
                        for (let i = 1; i < matchQueue.length; i++) {
                          const candidateMatch = matchQueue[i];
                          if (candidateMatch.includes(busyId)) continue;

                          for (let j = 0; j < candidateMatch.length; j++) {
                            const cId = candidateMatch[j];
                            if (playingPlayerIds.has(cId) || usedTargetIds.has(cId) || topMatch.includes(cId)) continue;

                            const candidate = players.find(p => p.id === cId);
                            if (!candidate) continue;

                            // Score: Level Diff (Lower is better) * 100 + Games Diff (Lower is better)
                            // Primary: Level, Secondary: Games
                            const levelDiff = Math.abs(candidate.level - busyPlayer.level);
                            const gamesDiff = candidate.gamesPlayed; // Just prioritize low games
                            const score = levelDiff * 1000 + gamesDiff;

                            if (!bestCandidate || score < bestCandidate.score) {
                              bestCandidate = { id: cId, matchIndex: i, playerIndex: j, score };
                            }
                          }
                        }

                        if (bestCandidate) {
                          swaps.push({ busyId, targetId: bestCandidate.id, matchIndex: bestCandidate.matchIndex, matchPlayerIndex: bestCandidate.playerIndex });
                          usedTargetIds.add(bestCandidate.id);
                        }
                      }

                      // Only proceed if we found swaps for ALL busy players in top match
                      if (swaps.length > 0 && swaps.length === busyInTop.length) {
                        const swapDesc = swaps.map(s => {
                          const bName = players.find(p => p.id === s.busyId)?.name;
                          const tName = players.find(p => p.id === s.targetId)?.name;
                          const bLevel = players.find(p => p.id === s.busyId)?.level;
                          const tLevel = players.find(p => p.id === s.targetId)?.level;
                          return `• ${bName} (忙/L${bLevel}) ↔ ${tName} (第${s.matchIndex + 1}組/L${tLevel})`;
                        }).join('\n');

                        if (window.confirm(`所有排程皆被卡住。\n建議與後方隊伍交換 (優先匹配等級) 以解鎖第一組：\n\n${swapDesc}\n\n是否執行交換並直接上場？`)) {
                          let newQueue = [...matchQueue];
                          let newTopMatch = [...topMatch];

                          // Apply swaps
                          swaps.forEach(s => {
                            // 1. Put target into top match
                            const busyIdx = newTopMatch.indexOf(s.busyId);
                            if (busyIdx !== -1) newTopMatch[busyIdx] = s.targetId;

                            // 2. Put busy into later match
                            const laterMatch = [...newQueue[s.matchIndex]];
                            laterMatch[s.matchPlayerIndex] = s.busyId;
                            newQueue[s.matchIndex] = laterMatch;
                          });

                          // Update queue first to reflect the swap
                          newQueue[0] = newTopMatch;
                          setMatchQueue(newQueue.slice(1)); // Remove top match as we are assigning it

                          // Assign the new top match immediately
                          setCourts(prev => prev.map(c => {
                            if (c.id === court.id) {
                              const courtName = c.name;
                              const pNames = players.filter(p => newTopMatch.includes(p.id)).map(p => p.name);
                              if (pNames.length > 0 && isAutoBroadcastEnabled) {
                                geminiService.broadcastAnnouncement(pNames, courtName);
                              }
                              return { ...c, players: newTopMatch, isActive: true, startTime: Date.now() };
                            }
                            return c;
                          }));
                          return;
                        } else {
                          return;
                        }
                      }
                    }

                    alert("目前佇列中所有對戰都有球員正在忙碌中，且後方無足夠閒置人員可供交換！");
                    return;
                  }

                  if (validIndex === 0) {
                    assignMatchToCourt(court.id, 0);
                  } else {
                    // Smart Skip
                    const skippedCount = validIndex;
                    if (window.confirm(`前 ${skippedCount} 組對戰有球員忙碌中，是否直接指派第 ${validIndex + 1} 組 (可上場)？`)) {
                      assignMatchToCourt(court.id, validIndex);
                    }
                  }
                }}
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

      {endingCourtId && (
        <ScoreInputModal
          ids={courts.find(c => c.id === endingCourtId)?.players || []}
          allPlayers={players}
          onConfirm={(score) => finalizeMatch(endingCourtId, score)}
          onCancel={() => setEndingCourtId(null)}
          onSkip={() => finalizeMatch(endingCourtId)}
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
