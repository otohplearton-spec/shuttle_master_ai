
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Player, Gender, Court, MatchHistory, UserProfile, Promotion, SortAlgorithm } from './types';
import AddPlayerForm from './components/AddPlayerForm';
import PlayerList from './components/PlayerList';
import CourtCard from './components/CourtCard';
import MatchQueue from './components/MatchQueue';
import MatchHistoryList from './components/MatchHistoryList';
import QuickImportModal from './components/QuickImportModal';
import ScoreInputModal from './components/ScoreInputModal';
import EndSessionModal from './components/EndSessionModal';
import LoginScreen from './components/LoginScreen';
import { lineService } from './services/lineService';
import { geminiService } from './services/geminiService';
import { memberService } from './services/memberService';
import { ecpayService } from './services/ecpayService';
import ECPayForm, { ECPayPaymentData } from './components/ECPayForm';
import PricingModal, { PricingPlan } from './components/PricingModal';
import PromotionBanner from './components/PromotionBanner';


// GLOBAL ERROR HANDLER FOR MOBILE DEBUGGING
if (typeof window !== 'undefined') {
  window.onerror = function (message, source, lineno, colno, error) {
    const errDiv = document.createElement('div');
    errDiv.style.position = 'fixed';
    errDiv.style.top = '0';
    errDiv.style.left = '0';
    errDiv.style.width = '100%';
    errDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
    errDiv.style.color = 'white';
    errDiv.style.padding = '20px';
    errDiv.style.zIndex = '99999';
    errDiv.style.fontSize = '14px';
    errDiv.style.whiteSpace = 'pre-wrap';
    errDiv.style.wordBreak = 'break-all';
    errDiv.innerText = `⚠️ FATAL ERROR:\n${message}\n\nLocation: ${source}:${lineno}`;
    document.body.appendChild(errDiv);
  };

  window.onunhandledrejection = function (event) {
    const errDiv = document.createElement('div');
    errDiv.style.position = 'fixed';
    errDiv.style.bottom = '0';
    errDiv.style.left = '0';
    errDiv.style.width = '100%';
    errDiv.style.backgroundColor = 'rgba(139, 0, 0, 0.9)';
    errDiv.style.color = 'white';
    errDiv.style.padding = '20px';
    errDiv.style.zIndex = '99999';
    errDiv.style.fontSize = '12px';
    errDiv.style.wordBreak = 'break-all';
    errDiv.innerText = `⚠️ ASYNC ERROR: ${event.reason}`;
    document.body.appendChild(errDiv);
  };
}

const App: React.FC = () => {
  // ---------------------------------------------------------------------------
  // 🚀 CRITICAL: POPUP MODE CHECK
  // ---------------------------------------------------------------------------
  const isPopupMode = typeof window !== 'undefined' &&
    (window.location.search.includes('line_login_check') || window.location.search.includes('liff.state'));

  // --- POPUP STATE ---
  const [popupState, setPopupState] = useState<{
    profile: UserProfile | null;
    status: string;
    error: string | null;
    logs: string[];
  }>({
    profile: null,
    status: 'Initializing...',
    error: null,
    logs: []
  });

  const addLog = (msg: string) => {
    setPopupState(prev => ({ ...prev, logs: [...prev.logs, `${new Date().toLocaleTimeString()} - ${msg}`] }));
  };

  // --- MAIN APP STATE (Defined here but used conditionally) ---
  const [isSessionActive, setIsSessionActive] = useState(() => {
    return localStorage.getItem('shuttle_session_active') === 'true';
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('shuttle_master_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Promotion State
  const [activePromotion, setActivePromotion] = useState<Promotion | null>(null);

  // --- POPUP LOGIC EFFECT ---
  useEffect(() => {
    if (!isPopupMode) return;

    const runPopupFlow = async () => {
      addLog('Starting Sync Flow...');
      addLog(`URL: ${window.location.href}`);

      try {
        setPopupState(prev => ({ ...prev, status: 'Starting LIFF...' }));
        addLog('Initializing LIFF...');

        const isLoggedIn = await lineService.init();
        addLog(`LIFF Init: ${isLoggedIn}`);

        if (isLoggedIn) {
          setPopupState(prev => ({ ...prev, status: 'Fetching Profile...' }));
          addLog('Getting Profile...');

          try {
            const profile = await lineService.getProfile();
            addLog(`Profile: ${profile ? 'Found' : 'Missing'}`);

            if (profile) {
              setPopupState(prev => ({ ...prev, profile: profile, status: 'Success' }));

              if (window.opener) {
                addLog('Sending to Opener...');
                setPopupState(prev => ({ ...prev, status: 'Syncing...' }));
                window.opener.postMessage({ type: 'LINE_LOGIN_SUCCESS', user: profile }, window.location.origin);
                setTimeout(() => window.close(), 1500);
              } else {
                addLog('No Opener (iOS PWA?) - Manual Copy Mode');
                setPopupState(prev => ({ ...prev, status: 'Manual Copy Required' }));
              }
            }
          } catch (pErr: any) {
            addLog(`Profile Error: ${pErr.message}`);
            setPopupState(prev => ({ ...prev, error: pErr.message }));
          }
        } else {
          setPopupState(prev => ({ ...prev, status: 'Redirecting to LINE...' }));
          addLog('Not logged in. Redirecting...');
          const cleanRedirectUri = window.location.origin + '?line_login_check=true';
          lineService.login(cleanRedirectUri);
        }
      } catch (err: any) {
        addLog(`Fatal Error: ${err.message}`);
        setPopupState(prev => ({ ...prev, error: err.message }));
      }
    };

    // Slight delay to ensure React mounted
    setTimeout(runPopupFlow, 100);
  }, [isPopupMode]);

  // --- REGULAR APP LOGIC EFFECT ---
  useEffect(() => {
    if (isPopupMode) return;

    const initMain = async () => {
      try {
        const isLoggedIn = await lineService.init();
        if (isLoggedIn && !currentUser) {
          const profile = await lineService.getProfile();
          if (profile) {
            // Update User State
            setCurrentUser(profile);
            localStorage.setItem('shuttle_master_user', JSON.stringify(profile));

            // Sync Latest Status from Google Sheet (e.g. PRO upgrade)
            const membership = await memberService.checkMembership(profile);
            if (membership) {
              const updated = { ...profile, ...membership };
              setCurrentUser(updated);
              localStorage.setItem('shuttle_master_user', JSON.stringify(updated));
            }
          }
        } else if (currentUser) {
          // Also re-check if user is already loaded from localstorage
          // This ensures refreshing the page updates the status
          const membership = await memberService.checkMembership(currentUser);
          if (membership) {
            const updated = { ...currentUser, ...membership };
            if (JSON.stringify(updated) !== JSON.stringify(currentUser)) {
              setCurrentUser(updated);
              localStorage.setItem('shuttle_master_user', JSON.stringify(updated));
            }
          }
        }

        // Check Promotion (Run for EVERYONE, including guests)
        try {
          const promoRes = await memberService.getActivePromotion();
          if (promoRes.success && promoRes.promotion) {
            setActivePromotion(promoRes.promotion);
          }
        } catch (err) {
          console.error('Promo fetch failed', err);
        }

      } catch (e) {
        console.error(e);
      }
    };
    initMain();

    const onMsg = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'LINE_LOGIN_SUCCESS' && event.data?.user) {
        const u = event.data.user;
        setCurrentUser(u);
        localStorage.setItem('shuttle_master_user', JSON.stringify(u));
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // --- POPUP RENDER ---
  if (isPopupMode) {
    const { profile, status, error, logs } = popupState;

    if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center">
          <h2 className="text-xl font-black text-red-700 mb-2">Login Error</h2>
          <p className="text-red-500 text-sm mb-6 break-all">{error}</p>
          <div className="text-xs text-left bg-slate-900 text-green-400 p-2 rounded w-full overflow-auto h-32 mt-4">
            {logs.map((L, i) => <div key={i}>{L}</div>)}
          </div>
          <a href="/" className="mt-6 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm">Return Home</a>
        </div>
      );
    }

    if (profile) {
      const loginStr = JSON.stringify(profile);
      return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center space-y-6">
          <h1 className="text-3xl font-black text-slate-800">登入成功！</h1>
          <p className="text-sm text-slate-500 font-bold">iOS PWA 專用模式</p>
          <div className="w-full bg-white p-4 rounded-xl shadow-lg border border-slate-100">
            <button
              onClick={() => navigator.clipboard.writeText(loginStr).then(() => alert('複製成功'))}
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-indigo-500/30 shadow-lg active:scale-95 transition-all"
            >
              📋 複製登入金鑰
            </button>
            <p className="text-[10px] text-slate-300 mt-2 text-center">回到 App 貼上即可</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-8"></div>
        <h2 className="text-xl font-bold text-slate-800 animate-pulse">{status}</h2>
        <div className="w-full mt-8 border-t border-slate-100 pt-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Debug Console</p>
          <div className="bg-slate-900 text-green-400 p-3 rounded-lg text-[10px] font-mono h-48 overflow-y-auto w-full">
            {logs.map((L, i) => <div key={i}>{L}</div>)}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 🏠 MAIN APP LOGIC (Only runs if NOT in popup mode)
  // ---------------------------------------------------------------------------

  // --- Initialize State from LocalStorage ---

  // --- MAIN APP INITIALIZATION ---
  useEffect(() => {
    if (isPopupMode) return;

    const initMain = async () => {
      try {
        const isLoggedIn = await lineService.init();
        if (isLoggedIn && !currentUser) {
          const profile = await lineService.getProfile();
          if (profile) {
            setCurrentUser(profile);
            localStorage.setItem('shuttle_master_user', JSON.stringify(profile));
          }
        }
      } catch (e) {
        console.error("Main Init Error", e);
      }
    };
    initMain();
  }, [isPopupMode]);

  const [isPlayerActionsCollapsed, setIsPlayerActionsCollapsed] = useState(false);

  // --- Auto-Assign State ---
  const [isAutoAssignEnabled, setIsAutoAssignEnabled] = useState(() => {
    return localStorage.getItem('shuttle_auto_assign_enabled') === 'true';
  });
  const [autoAssignInterval, setAutoAssignInterval] = useState(() => {
    const saved = localStorage.getItem('shuttle_auto_assign_interval');
    return saved ? parseInt(saved, 10) : 5;
  });

  // Persist Auto-Assign State
  useEffect(() => {
    localStorage.setItem('shuttle_auto_assign_enabled', String(isAutoAssignEnabled));
    localStorage.setItem('shuttle_auto_assign_interval', String(autoAssignInterval));
  }, [isAutoAssignEnabled, autoAssignInterval]);

  // --- Auto-Assign Timer Logic ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isAutoAssignEnabled) {
      intervalId = setInterval(() => {
        // Only trigger if we have empty courts AND people in queue
        // We need to access the LATEST state, so we'll use the functional update or just rely on the closure if deps are right.
        // Since autoAssignAllEmptyCourts uses state, we simply call it.
        // However, autoAssignAllEmptyCourts definition needs to be stable or we need to include it in deps.
        // For simplicity and safety in this big component, we will call a wrapper that calls the function.
        // Actually, we can't easily access the *latest* courts/queue inside a simple interval closure without refs or complex dependency management.
        // A common pattern is using a ref to hold the latest function or state.

        // Let's rely on the fact that App re-renders often. But for a timer, we need to be careful.
        // We will move this useEffect usage *after* autoAssignAllEmptyCourts is defined, OR define a Ref that always holds current state.

        // Actually, for this specific request, let's look at where we are inserting.
        // We are at line 278, which is BEFORE autoAssignAllEmptyCourts is defined (it's around line 662).
        // WE CANNOT CALL IT HERE if it's defined later with `const`.
        // I will insert the State here, but the Logic/Effect needs to go AFTER the function definition.
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isAutoAssignEnabled]); // This is a placeholder comment, I will NOT insert the effect here.

  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('shuttle_players');
    return saved ? JSON.parse(saved) : [];
  });

  const [courts, setCourts] = useState<Court[]>(() => {
    const saved = localStorage.getItem('shuttle_courts');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: '場地 A', players: [], isActive: false }
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
  // Mobile View Mode: 'none' | 'menu' | 'players' | 'queue'
  const [activeMobileView, setActiveMobileView] = useState<'none' | 'menu' | 'players' | 'queue'>('none');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
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

  // 字體大小 (百分比 80-130)
  const [fontSizeScale, setFontSizeScale] = useState(() => {
    const saved = localStorage.getItem('fontSizeScale');
    return saved !== null ? Number(saved) : 100;
  });

  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'fail'>('idle');
  const [ecpayData, setEcpayData] = useState<ECPayPaymentData | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);


  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('shuttle_master_user', JSON.stringify(user));

    // Sync with Google Sheet (Upsert user)
    memberService.checkMembership(user).then(updatedStatus => {
      if (updatedStatus) {
        const updatedUser = { ...user, ...updatedStatus };
        setCurrentUser(updatedUser);
        localStorage.setItem('shuttle_master_user', JSON.stringify(updatedUser));
      }
    });
  };

  // Check for Payment Callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const transactionId = params.get('transactionId');
    if (transactionId) {
      setPaymentStatus('processing');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);

      memberService.confirmUpgrade(transactionId).then(res => {
        if (res.success) {
          alert('🎉 恭喜升級成為 PRO 會員！');
          setPaymentStatus('success');
          // Force reload profile to update UI immediately
          lineService.getProfile().then(p => {
            if (p) {
              setCurrentUser(p);
              localStorage.setItem('shuttle_master_user', JSON.stringify(p));
            }
            window.location.reload();
          });
        } else {
          alert('付款確認失敗: ' + res.message);
          setPaymentStatus('fail');
        }
      });
    }
  }, []);

  const handleUpgrade = () => {
    // Guest Check
    if (currentUser?.userId.startsWith('guest_')) {
      if (window.confirm('👻 訪客模式無法訂閱 PRO 會員\n\nPRO 會員權益需要綁定帳號才能永久保存。\n\n是否現在登出，並切換至 LINE/Google 登入？')) {
        handleLogout();
      }
      return;
    }
    setShowPricingModal(true);
  };

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!currentUser) return;
    setPaymentStatus('processing');
    const res = await ecpayService.createPayment(currentUser.userId, plan.name, plan.price, plan.days);

    if (res.success && res.paymentData) {
      setEcpayData(res.paymentData);
    } else {
      setPaymentStatus('fail');
      alert('建立付款失敗: ' + (res.message || '未知錯誤'));
    }
  };

  const handleRedeemCode = async (code: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const res = await memberService.redeemCode(currentUser.userId, code);
      if (res.success) {
        // Optimistic UI Update to solve "No Refresh" confusion
        const updatedUser = {
          ...currentUser,
          isPro: true,
          // Extend local expiry visually if days returned, otherwise just set PRO
          // We can assume valid for now.
        };

        // 1. Update State Immediately
        setCurrentUser(updatedUser);
        localStorage.setItem('shuttle_master_user', JSON.stringify(updatedUser));

        // 2. Close Modal
        setShowPricingModal(false);

        // 3. Show Success Message
        alert(`🎉 兌換成功！\n\n您已升級為 PRO 會員！\n效期已延長 ${res.daysAdded || ''} 天。`);

        // 4. Reload to ensure deep state sync (optional but recommended for strictly gated features)
        window.location.reload();

        return true;
      } else {
        alert('兌換失敗: ' + (res.message || '無效的邀請碼'));
        return false;
      }
    } catch (e) {
      alert('發生錯誤，請稍後再試');
      return false;
    }
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
    localStorage.setItem('fontSizeScale', String(fontSizeScale));
    // Apply font size to root
    const baseSize = 16; // Default base size
    const newSize = baseSize * (fontSizeScale / 100);
    document.documentElement.style.fontSize = `${newSize}px`;
  }, [fontSizeScale]);

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
    setShowEndSessionModal(true);
  };

  const handleClearHistoryOnly = () => {
    // 1. Reset Courts (remove players, set inactive)
    setCourts(prev => prev.map(c => ({ ...c, players: [], isActive: false, startTime: undefined })));

    // 2. Clear Queue & History
    setMatchQueue([]);
    setHistory([]);
    setMatchCount(0);

    // 3. Reset Player Stats (Games Played) - Assume new session means fresh starts
    setPlayers(prev => prev.map(p => ({ ...p, gamesPlayed: 0 })));

    // 4. Close Modal
    setShowEndSessionModal(false);
    setActiveMobileView('none');
    alert("已清除所有對戰紀錄，並保留球員名單。");
  };

  const handleClearAll = () => {
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
      { id: '1', name: '場地 A', players: [], isActive: false }
    ]);

    setIsSessionActive(false);
    setActiveMobileView('none');
    setShowEndSessionModal(false);
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

  const updatePlayerTargetGames = (id: string, newTarget: number) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, targetGames: Math.max(1, newTarget) } : p));
  };

  const togglePlayerPause = (id: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, isPaused: !p.isPaused } : p));
  };

  const deletePlayer = (id: string) => {
    if (busyPlayerIds.has(id)) {
      alert("該球友正在比賽或排隊中，請先從名單移除再刪除！");
      return;
    }
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const addCourt = () => {
    // PRO Feature: Limit courts for non-pro users
    if (courts.length >= 2 && !currentUser?.isPro) {
      if (window.confirm("✨ 進階功能提示\n\n一般會員僅限使用 2 面場地。\n\n是否立即升級 PRO 會員以解鎖無限場地？")) {
        handleUpgrade();
      }
      return;
    }

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

  const cancelMatch = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (!court || !court.isActive) return;

    const playersToReturn = court.players.filter(Boolean) as string[];

    if (playersToReturn.length > 0) {
      setMatchQueue(prev => [playersToReturn, ...prev]);
    }

    setCourts(prev => prev.map(c => c.id === courtId ? { ...c, players: [], isActive: false, startTime: undefined } : c));
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

  const autoAssignAllEmptyCourts = (isAuto = false) => {
    const availableCourts = courts.filter(c => !c.isActive);
    if (availableCourts.length === 0 || matchQueue.length === 0) {
      if (!isAuto) {
        // Optionally alert if manual and no courts/queue, but originally it just returned.
        // Let's keep original behavior of returning silently for early checks, 
        // but if we want to confirm action to user we might want an alert. 
        // The original code returned silently at line 704.
      }
      return;
    }

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

      if (!isAuto && assignedCount < availableCourts.length) {
        alert(`已指派 ${assignedCount} 場比賽。部分場地因球員忙碌或佇列不足而未指派。`);
      }
    } else {
      if (!isAuto) {
        alert("佇列中所有對戰的球員似乎都正在忙碌中，無法自動指派。");
      }
    }
  };

  // Use a Ref to hold the latest function to avoid restarting the interval on every render
  const autoAssignRef = useRef(autoAssignAllEmptyCourts);
  useEffect(() => {
    autoAssignRef.current = autoAssignAllEmptyCourts;
  });

  useEffect(() => {
    if (!isAutoAssignEnabled) return;

    const tick = () => {
      // Pass isAuto = true to suppress alerts
      autoAssignRef.current(true);
    };

    const id = setInterval(tick, autoAssignInterval * 1000);
    return () => clearInterval(id);
  }, [isAutoAssignEnabled, autoAssignInterval]);

  /**
   * --- 核心演算法：本地智慧排點 (極致平衡場次版) ---
   */
  // ... (keep generateSmartRound exactly as is, but it's inside component, so we just use the existing one)
  const generateSmartRound = (currentPlayers: Player[], currentHistory: MatchHistory[], queueSoFar: string[][], algorithm: SortAlgorithm = 'normal'): string[] | null => {
    // 智慧排點不再排除正在場上的球員，而是將他們一併納入考量
    // 但會透過 projectedGames 增加場次權重，避免他們如果正在打，還被排在很前面
    const available = currentPlayers.filter(p => !p.isPaused);
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
      const tA = a.targetGames || 6;
      const tB = b.targetGames || 6;

      // 優先權 1: 尚未達標者優先 (Finished = false 排前面)
      const finishedA = gA >= tA;
      const finishedB = gB >= tB;
      if (finishedA !== finishedB) {
        return finishedA ? 1 : -1;
      }

      // 如果都未達標 -> 優先滿足「剩餘場次需求 (Deficit)」較大者
      // 例如：A(0/7) 剩7, B(0/6) 剩6 -> A 優先
      // 這能確保高目標者比較早開始打，不會最後時間不夠
      if (!finishedA) {
        const deficitA = tA - gA;
        const deficitB = tB - gB;
        if (deficitA !== deficitB) return deficitB - deficitA; // 大者優先

        if (gA !== gB) return gA - gB;
      } else {
        // 如果都已達標 (加賽/湊人數階段)
        // 優先權 2: 超額量 (Surplus) 少者優先 (由 +0 變 +1，優於 +1 變 +2)
        const surplusA = gA - tA;
        const surplusB = gB - tB;
        if (surplusA !== surplusB) return surplusA - surplusB;

        // 優先權 3: (若超額量相同) 目標場次 *多* 者優先 (體力好/預算多的人多打)
        // 這避免 目標5場的人(G:5 T:5) 被抓去填補 目標7場的人(G:7 T:7) 的缺
        if (tA !== tB) return tB - tA;
      }

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
      const p1 = selectedPlayers.find(p => p.id === team1Ids[0]);
      const p2 = selectedPlayers.find(p => p.id === team1Ids[1]);
      const p3 = selectedPlayers.find(p => p.id === team2Ids[0]);
      const p4 = selectedPlayers.find(p => p.id === team2Ids[1]);

      const lv1 = (p1?.level || 0) + (p2?.level || 0);
      const lv2 = (p3?.level || 0) + (p4?.level || 0);

      // 1. Level Balance Penalty (Base)
      penalty += Math.abs(lv1 - lv2) * 2;

      // 2. Algorithm Specific Logic
      if (algorithm === 'mixed') {
        // Mixed Doubles Priority: Penalize same-gender teams heavily
        const isTeam1Mixed = p1?.gender !== p2?.gender;
        const isTeam2Mixed = p3?.gender !== p4?.gender;
        if (!isTeam1Mixed) penalty += 500;
        if (!isTeam2Mixed) penalty += 500;
      }

      // 3. History Penalties
      const partnerPenaltyWeight = algorithm === 'avoid_repeat' ? 200 : 15;
      const opponentPenaltyWeight = algorithm === 'avoid_repeat' ? 100 : 5;
      const queuePenaltyWeight = algorithm === 'avoid_repeat' ? 300 : 20;

      recentHistory.forEach(h => {
        h.teams.forEach(t => {
          if (t.includes(team1Ids[0]) && t.includes(team1Ids[1])) penalty += partnerPenaltyWeight;
          if (t.includes(team2Ids[0]) && t.includes(team2Ids[1])) penalty += partnerPenaltyWeight;
        });
      });
      queueSoFar.forEach(m => {
        if ((m[0] === team1Ids[0] && m[1] === team1Ids[1]) || (m[0] === team1Ids[1] && m[1] === team1Ids[0])) penalty += queuePenaltyWeight;
        if ((m[2] === team2Ids[0] && m[3] === team2Ids[1]) || (m[2] === team2Ids[1] && m[3] === team2Ids[0])) penalty += queuePenaltyWeight;
      });
      recentHistory.forEach(h => {
        const hT1 = h.teams[0];
        const hT2 = h.teams[1];
        const isOpponentInHistory = (hT1.includes(team1Ids[0]) && hT2.includes(team2Ids[0])) ||
          (hT1.includes(team1Ids[0]) && hT2.includes(team2Ids[1])) ||
          (hT2.includes(team1Ids[0]) && hT1.includes(team2Ids[0])) ||
          (hT2.includes(team1Ids[0]) && hT1.includes(team2Ids[1]));
        if (isOpponentInHistory) penalty += opponentPenaltyWeight;
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
      const candidatePlayers = players.filter(p => !playingPlayerIds.has(p.id) && !p.isPaused);
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

  const normalScheduleQueue = (roundsRequested: number = 5, algorithm: SortAlgorithm = 'normal') => {
    if (players.length < 4) return;
    const newRounds: string[][] = [];
    let currentQueueState = [...matchQueue];
    for (let i = 0; i < roundsRequested; i++) {
      const round = generateSmartRound(players, history, currentQueueState, algorithm);
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
    <div className="h-[100dvh] bg-slate-100 text-slate-900 flex flex-col overflow-hidden">

      {/* Promotion Banner (Full Width) */}
      <PromotionBanner
        activePromotion={activePromotion}
        onOpenPricing={handleUpgrade}
      />

      {/* Main Content Container (Centered & Padded) */}
      <div className="flex-1 w-full flex flex-col items-center md:p-8 overflow-hidden min-h-0">
        <div className="w-full max-w-[1700px] flex flex-col h-full bg-transparent">

          <header className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-8 pt-4 md:pt-0 px-4 md:px-0">
            <div className="flex items-center gap-4">
              {/* Use Avatar */}
              {currentUser.pictureUrl ? (
                <img src={currentUser.pictureUrl} alt={currentUser.displayName} className="w-12 h-12 rounded-full border-2 border-white shadow-md hidden lg:block" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-500 hidden lg:flex items-center justify-center text-xl text-white font-bold shadow-md">
                  {currentUser.displayName.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-br from-indigo-600 to-blue-500 bg-clip-text text-transparent italic tracking-tighter">
                  SHUTTLE MASTER AI
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">Centralized Smart Queue System</p>
                  <span className="hidden lg:inline-block w-1 h-1 bg-slate-300 rounded-full"></span>
                  <p className="hidden lg:block text-slate-500 text-xs font-bold">Hi, {currentUser.displayName}</p>
                  {currentUser.isPro && (
                    <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md ml-2 shadow-sm border border-amber-200 tracking-wider">
                      PRO
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* 計分模式開關 (Desktop Only) */}
              <div className="hidden lg:flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border-2 border-slate-100 shadow-sm transition-all hover:border-amber-200">
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

              {/* 語音廣播開關 (Desktop Only) */}
              <div className="hidden lg:flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border-2 border-slate-100 shadow-sm transition-all hover:border-indigo-200">
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

              {/* Auto Assign (Desktop Only) */}
              <div className="hidden lg:flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border-2 border-slate-100 shadow-sm transition-all hover:border-emerald-200">
                <div className={`p-1.5 rounded-lg transition-colors ${isAutoAssignEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 leading-none mb-0.5">自動上場 ({autoAssignInterval}s)</span>
                  <span className={`text-[11px] font-bold leading-none ${isAutoAssignEnabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {isAutoAssignEnabled ? '開啟中' : '已關閉'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAutoAssignEnabled(!isAutoAssignEnabled)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAutoAssignEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAutoAssignEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  {isAutoAssignEnabled && (
                    <input
                      type="number"
                      min="2"
                      max="60"
                      value={autoAssignInterval}
                      onChange={(e) => setAutoAssignInterval(Math.max(2, Math.min(60, Number(e.target.value))))}
                      className="w-12 h-6 text-xs text-center border border-slate-200 rounded-md focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>
              </div>

              {/* Mobile Menu Button (Docked) */}
              {/* Mobile Header Toolbar: Menu, Players, Queue, Add, Games */}
              <div className="lg:hidden flex items-center gap-2">
                <button
                  onClick={() => setActiveMobileView('menu')}
                  className="p-1.5 rounded-xl bg-white text-indigo-600 shadow-sm border-2 border-indigo-100 hover:bg-indigo-50 transition-all"
                  aria-label="Menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveMobileView('players')}
                  className="p-1.5 rounded-xl bg-white text-indigo-600 shadow-sm border-2 border-indigo-100 hover:bg-indigo-50 transition-all"
                  aria-label="Players"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveMobileView('queue')}
                  className="p-1.5 rounded-xl bg-white text-indigo-600 shadow-sm border-2 border-indigo-100 hover:bg-indigo-50 transition-all"
                  aria-label="Queue"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </button>
                <button onClick={addCourt} className="p-1.5 rounded-xl bg-white text-indigo-600 shadow-sm border-2 border-indigo-100 hover:bg-indigo-50 transition-all font-black text-lg w-[44px] h-[44px] flex items-center justify-center">
                  ＋
                </button>
                <div className="bg-slate-800 text-white px-3 py-2 rounded-2xl flex items-baseline gap-1 shadow-xl border-2 border-slate-700/50">
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest leading-none">Games</span>
                  <span className="text-xl font-black leading-none">{matchCount}</span>
                </div>
              </div>

              {/* Desktop Header Toolbar */}
              <div className="hidden lg:flex items-center gap-4">
                {currentUser?.isPro ? (
                  <button
                    onClick={() => handleUpgrade()}
                    className="relative overflow-hidden bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 px-4 py-2 rounded-2xl font-black shadow-sm border-2 border-yellow-300 transform hover:scale-105 transition-all group"
                    title={`到期日: ${currentUser.expiryDate ? new Date(currentUser.expiryDate).toLocaleDateString() : '未知'}`}
                  >
                    <div className="flex items-center gap-2 group-hover:invisible transition-all duration-200">
                      <span>👑 PRO</span>
                      <span className="text-xs bg-white/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        剩 {currentUser.expiryDate ? Math.max(0, Math.ceil((new Date(currentUser.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0} 天
                      </span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center font-black text-yellow-800 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-gradient-to-r from-amber-200 to-yellow-400">
                      <span>➕ 延長效期</span>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade()}
                    className="bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 px-4 py-2 rounded-2xl font-black shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-1 border-2 border-yellow-300 animate-pulse"
                  >
                    <span>👑</span> 升級 PRO
                  </button>
                )}

                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="bg-white px-4 py-2 rounded-2xl font-bold text-slate-600 shadow-sm border-2 border-slate-200 hover:border-slate-400 hover:text-slate-800 transition-all text-sm flex items-center gap-2"
                >
                  📜 歷史
                </button>

                <button
                  onClick={handleEndSession}
                  className="px-4 py-2 rounded-2xl font-black transition-all shadow-sm text-sm border-2 bg-white border-slate-200 text-slate-400 hover:border-red-400 hover:text-red-500"
                >
                  結束
                </button>

                <button onClick={addCourt} className="bg-white border-2 border-indigo-600 text-indigo-600 px-6 py-2 rounded-2xl font-black hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                  ＋ 場地
                </button>
                <div className="bg-slate-800 text-white px-3 py-2 rounded-2xl flex items-baseline gap-2 shadow-xl border-2 border-slate-700/50">
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest leading-none">Games</span>
                  <span className="text-xl font-black leading-none">{matchCount}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={handleLogout}
                  className="hidden lg:flex items-center gap-1 bg-white px-3 py-1.5 rounded-2xl border-2 border-slate-100 shadow-sm transition-all hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-500 ml-auto"
                  title="登出"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 relative px-4 md:px-0 pb-4 md:pb-0 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {activeMobileView !== 'none' && (
              <div
                className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden animate-in fade-in"
                onClick={() => setActiveMobileView('none')}
              />
            )}

            {/* Left Column: Player Management (Sidebar on Mobile) */}
            {/* Left Column: Mobile Sidebar (Fixed Drawer) */}
            <div className={`
            lg:hidden flex flex-col gap-6 h-full transition-transform duration-300 ease-in-out
            fixed inset-0 z-50 w-full bg-slate-100 p-4 shadow-2xl overflow-hidden
            ${(activeMobileView === 'menu' || activeMobileView === 'players') ? 'translate-x-0' : '-translate-x-full'}
          `}>
              {/* Header for Mobile Sidebar */}
              <div className="flex justify-between items-center mb-4 shrink-0 border-b border-slate-200 pb-4">
                <h3 className="font-black text-2xl text-slate-800">
                  {activeMobileView === 'menu' ? 'Menu' : '👥 球員管理'}
                </h3>
                <div className="flex items-center gap-2">
                  {activeMobileView === 'players' && (
                    <button
                      onClick={() => setIsPlayerActionsCollapsed(!isPlayerActionsCollapsed)}
                      className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center transition-colors"
                    >
                      {isPlayerActionsCollapsed ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                      )}
                    </button>
                  )}
                  <button onClick={() => setActiveMobileView('none')} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold">✕</button>
                </div>
              </div>

              {/* CONTENT: SYSTEM MENU (Only show if view is 'menu') */}
              {(activeMobileView === 'menu') && (
                <div className="space-y-4 shrink-0 overflow-y-auto flex-1 pb-24 custom-scrollbar">
                  {/* User Profile Card in Menu */}
                  <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-4">
                    {currentUser.pictureUrl ? (
                      <img src={currentUser.pictureUrl} alt={currentUser.displayName} className="w-14 h-14 rounded-full border-2 border-indigo-100 shadow-sm" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center text-2xl text-white font-bold shadow-sm">
                        {currentUser.displayName.charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg text-slate-800">{currentUser.displayName}</span>
                        {currentUser.isPro && (
                          <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm border border-amber-200 tracking-wider">
                            PRO
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-bold">已登入</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🏆</span>
                        <span className="font-bold text-slate-700">計分模式</span>
                      </div>
                      <button
                        onClick={() => setIsScoreEnabled(!isScoreEnabled)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isScoreEnabled ? 'bg-amber-500' : 'bg-slate-200'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isScoreEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📢</span>
                        <span className="font-bold text-slate-700">自動廣播</span>
                      </div>
                      <button
                        onClick={() => setIsAutoBroadcastEnabled(!isAutoBroadcastEnabled)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAutoBroadcastEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAutoBroadcastEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex flex-col p-3 bg-white rounded-xl border border-slate-200 shadow-sm gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🤖</span>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">自動上場</span>
                            <span className="text-xs text-slate-400">系統每 {autoAssignInterval} 秒檢查空場</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsAutoAssignEnabled(!isAutoAssignEnabled)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAutoAssignEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAutoAssignEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      {isAutoAssignEnabled && (
                        <div className="flex items-center gap-3 px-2">
                          <span className="text-xs font-bold text-slate-400">2s</span>
                          <input
                            type="range"
                            min="2"
                            max="60"
                            step="1"
                            value={autoAssignInterval}
                            onChange={(e) => setAutoAssignInterval(Number(e.target.value))}
                            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                          <span className="text-xs font-bold text-slate-400">60s</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setShowHistoryModal(true); setActiveMobileView('none'); }}
                      className="p-3 rounded-xl font-bold bg-white text-slate-600 shadow-sm border-2 border-slate-200 hover:border-slate-400 flex items-center justify-center gap-2"
                    >
                      📜 歷史紀錄
                    </button>
                    <button
                      onClick={handleLogout}
                      className="p-3 rounded-xl font-bold bg-white text-slate-400 shadow-sm border-2 border-slate-200 hover:bg-red-50 hover:text-red-500 flex items-center justify-center gap-2"
                    >
                      🚪 登出
                    </button>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-600">🅰️ 字體大小 (Font Size)</span>
                      <span className="text-xs font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{fontSizeScale}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">A</span>
                      <input
                        type="range"
                        min="85"
                        max="125"
                        step="5"
                        value={fontSizeScale}
                        onChange={(e) => setFontSizeScale(Number(e.target.value))}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <span className="text-lg font-black text-slate-600">A</span>
                    </div>
                  </div>

                  {currentUser?.isPro ? (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-yellow-200 rounded-xl p-4 mb-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-yellow-800 font-black">
                          <span className="text-xl">👑</span> PRO 會員效期中
                        </div>
                        <span className="bg-white/50 text-yellow-700 px-2 py-1 rounded-lg text-xs font-bold border border-yellow-100">
                          剩餘 {currentUser.expiryDate ? Math.max(0, Math.ceil((new Date(currentUser.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0} 天
                        </span>
                      </div>
                      <div className="text-xs text-yellow-600/80 font-bold ml-1">
                        到期日: {currentUser.expiryDate ? new Date(currentUser.expiryDate).toLocaleDateString() : '未知'}
                      </div>
                      <button
                        onClick={() => {
                          setActiveMobileView('none');
                          handleUpgrade();
                        }}
                        className="w-full py-2 bg-white border-2 border-yellow-300 text-yellow-700 rounded-xl font-black shadow-sm hover:bg-yellow-50 transition-all flex items-center justify-center gap-1"
                      >
                        <span>➕</span> 延長效期 (Extend)
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveMobileView('none');
                        handleUpgrade();
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 mb-3 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 rounded-xl font-black shadow-lg shadow-yellow-200/50"
                    >
                      <span className="text-xl">👑</span> 升級 PRO (解鎖功能)
                    </button>
                  )}

                  <button
                    onClick={handleEndSession}
                    className="w-full p-3 rounded-xl font-black transition-all shadow-sm border-2 flex items-center justify-center gap-2 bg-slate-100 border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    🛑 結束本次活動
                  </button>
                </div>
              )}

              {/* CONTENT: PLAYERS (Mobile Only) */}
              {(activeMobileView === 'players') && (
                <div className="flex flex-col gap-6 h-full overflow-hidden">
                  {!isPlayerActionsCollapsed && (
                    <div className="flex gap-3 mb-4 shrink-0 animate-in fade-in slide-in-from-top-1">
                      <div className="flex-1">
                        <AddPlayerForm onAdd={addPlayer} />
                      </div>
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="flex-1 py-4 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-500 font-bold hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-700 transition-all flex items-center justify-center gap-2 group"
                      >
                        <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 group-hover:scale-110 transition-all text-xl">📋</span>
                        <span>批次匯入</span>
                      </button>
                    </div>
                  )}
                  <PlayerList
                    players={players}
                    courts={courts}
                    matchQueue={matchQueue}
                    history={history}
                    playingPlayerIds={playingPlayerIds}
                    queuedPlayerIds={queuedPlayerIds}
                    onDelete={deletePlayer}
                    onUpdateLevel={updatePlayerLevel}
                    onUpdateTargetGames={updatePlayerTargetGames}
                    onTogglePause={togglePlayerPause}
                    isPro={currentUser?.isPro ?? false}
                    onUpgrade={() => handleUpgrade()}
                  />
                </div>
              )}
            </div>

            {/* Left Column: Desktop Sidebar (Static) */}
            <div className="hidden lg:col-span-3 lg:flex flex-col gap-6 h-full overflow-hidden">
              <div className="flex gap-3 mb-2 shrink-0">
                <div className="flex-1">
                  <AddPlayerForm onAdd={addPlayer} />
                </div>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex-1 py-4 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-500 font-bold hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-700 transition-all flex items-center justify-center gap-2 group"
                >
                  <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 group-hover:scale-110 transition-all text-xl">📋</span>
                  <span>批次匯入</span>
                </button>
              </div>
              <PlayerList
                players={players}
                courts={courts}
                matchQueue={matchQueue}
                history={history}
                playingPlayerIds={playingPlayerIds}
                queuedPlayerIds={queuedPlayerIds}
                onDelete={deletePlayer}
                onUpdateLevel={updatePlayerLevel}
                onUpdateTargetGames={updatePlayerTargetGames}
                onTogglePause={togglePlayerPause}
                isPro={currentUser?.isPro ?? false}
                onUpgrade={() => handleUpgrade()}
              />
            </div>

            <div className={`lg:col-span-6 h-full flex flex-col min-h-0`}>
              {/* Mobile Court list scroll container */}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6 flex-1 overflow-y-auto custom-scrollbar px-1 pb-40 content-start`}>
                {courts.map(court => (
                  <CourtCard
                    key={court.id}
                    court={court}
                    allPlayers={players}
                    busyPlayerIds={busyPlayerIds}
                    playingPlayerIds={playingPlayerIds}
                    onEndMatch={endMatch}
                    onCancelMatch={cancelMatch}
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
            </div>

            <div className="hidden lg:col-span-3 lg:flex flex-col gap-6 h-full overflow-hidden">
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
                isPro={currentUser?.isPro ?? false}
                onUpgrade={() => handleUpgrade()}
              />
            </div>

            {/* Mobile Right Sidebar: Queue */}
            <div className={`
            fixed inset-0 z-50 w-full bg-slate-100 p-0 shadow-2xl overflow-hidden flex flex-col transition-transform duration-300 ease-in-out lg:hidden
            ${activeMobileView === 'queue' ? 'translate-x-0' : 'translate-x-full'}
          `}
              style={{ pointerEvents: activeMobileView === 'queue' ? 'auto' : 'none' }}
            >
              <div className="flex-1 min-h-0 h-full overflow-hidden pb-8">
                {activeMobileView === 'queue' && (
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
                    onClose={() => setActiveMobileView('none')}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {
          showImportModal && (
            <QuickImportModal onClose={() => setShowImportModal(false)} onImport={bulkAddPlayers} />
          )
        }

        {
          showHistoryModal && (
            <MatchHistoryList
              history={history}
              allPlayers={players}
              onClose={() => setShowHistoryModal(false)}
              currentUser={currentUser}
            />
          )
        }

        {
          endingCourtId && (
            <ScoreInputModal
              ids={courts.find(c => c.id === endingCourtId)?.players || []}
              allPlayers={players}
              onConfirm={(score) => finalizeMatch(endingCourtId, score)}
              onCancel={() => setEndingCourtId(null)}
              onSkip={() => finalizeMatch(endingCourtId)}
            />
          )
        }

        <EndSessionModal
          isOpen={showEndSessionModal}
          onClose={() => setShowEndSessionModal(false)}
          onClearHistoryOnly={handleClearHistoryOnly}
          onClearAll={handleClearAll}
        />

        <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      `}</style>
        {
          ecpayData && <ECPayForm paymentData={ecpayData} />
        }

        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          onSelectPlan={handleSelectPlan}
          onRedeemCode={handleRedeemCode}
          isLoading={paymentStatus === 'processing'}
          activePromotion={activePromotion}
        />

      </div>
    </div>
  );
};

export default App;
