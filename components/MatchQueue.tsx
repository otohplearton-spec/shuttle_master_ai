
import React, { useState, useEffect } from 'react';
import { Player, Gender, Court, MatchHistory, SortAlgorithm } from '../types';

interface MatchQueueProps {
  queue: string[][];
  allPlayers: Player[];
  history: MatchHistory[];
  busyPlayerIds: Set<string>;
  playingPlayerIds: Set<string>;
  onSchedule: (rounds: number) => void;
  onNormalSchedule: (rounds: number) => void;
  onAddBlankMatch: () => void;
  onManualSchedule: () => void;
  onRemove: (index: number) => void;
  onReorder: (index: number, direction: 'up' | 'down') => void;
  onSwapPlayer: (qIdx: number, oldId: string, newId: string) => void;
  isScheduling: boolean;
  availableCourts: Court[];
  onAssignToCourt: (courtId: string, queueIndex: number) => void;
  onAutoAssignAll: () => void;
  onClose?: () => void;
  isPro: boolean;
  onUpgrade: () => void;
}

const MatchQueue: React.FC<MatchQueueProps> = ({
  queue, allPlayers, history, busyPlayerIds, playingPlayerIds,
  onSchedule, onNormalSchedule, onAddBlankMatch, onManualSchedule, onRemove, onReorder, onSwapPlayer, isScheduling,
  availableCourts, onAssignToCourt, onAutoAssignAll, onClose, isPro, onUpgrade
}) => {
  const [swappingIdx, setSwappingIdx] = useState<{ qIdx: number, pIdx: number } | null>(null);
  const [sortAlgorithm, setSortAlgorithm] = useState<SortAlgorithm>('normal');

  const algorithmLabels: Record<SortAlgorithm, string> = {
    'normal': '普通智排',
    'mixed': '混雙優先',
    'avoid_repeat': '避免重複',
    'ai': 'AI 智慧排點'
  };

  const cycleAlgorithm = (direction: 'up' | 'down') => {
    const modes: SortAlgorithm[] = ['normal', 'mixed', 'avoid_repeat', 'ai'];
    const currentIdx = modes.indexOf(sortAlgorithm);
    let newIdx;
    if (direction === 'up') {
      newIdx = (currentIdx - 1 + modes.length) % modes.length;
    } else {
      newIdx = (currentIdx + 1) % modes.length;
    }
    setSortAlgorithm(modes[newIdx]);
  };

  // ... existing code ...



  React.useEffect(() => {
    const activePlayers = allPlayers.filter(p => !p.isPaused);
    const totalTargetGames = activePlayers.reduce((sum, p) => sum + (p.targetGames || 6), 0);
    const targetMatchCount = Math.ceil(totalTargetGames / 4);

    const historyCount = history.length;
    const activeMatchesCount = Math.floor(playingPlayerIds.size / 4);
    const queueCount = queue.length;

    const suggested = Math.max(1, targetMatchCount - historyCount - activeMatchesCount - queueCount);
    setRoundsToSchedule(suggested);
  }, [allPlayers, queue.length, history.length, playingPlayerIds.size]);

  const [roundsToSchedule, setRoundsToSchedule] = useState(1);
  const [expandedMatchIdx, setExpandedMatchIdx] = useState<number | null>(null);

  // Persist collapse state
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(() => {
    const saved = localStorage.getItem('shuttle_match_queue_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('shuttle_match_queue_collapsed', String(isControlsCollapsed));
  }, [isControlsCollapsed]);

  const activeEditingId = swappingIdx ? queue[swappingIdx.qIdx][swappingIdx.pIdx] : null;
  const currentMatchIds = swappingIdx ? queue[swappingIdx.qIdx] : [];

  const selectablePlayers = [...allPlayers].sort((a, b) => {
    const aInMatch = currentMatchIds.includes(a.id) ? 1 : 0;
    const bInMatch = currentMatchIds.includes(b.id) ? 1 : 0;
    if (aInMatch !== bInMatch) return bInMatch - aInMatch;
    return b.level - a.level;
  });

  const handleStartSwap = (qIdx: number, pIdx: number) => {
    (window as any)._lastPIdx = pIdx;
    setSwappingIdx({ qIdx, pIdx });
  };

  const analyzeMatch = (matchIds: string[]) => {
    const p = matchIds.map(id => allPlayers.find(x => x.id === id));
    const lv1 = (p[0]?.level || 0) + (p[1]?.level || 0);
    const lv2 = (p[2]?.level || 0) + (p[3]?.level || 0);
    const diff = Math.abs(lv1 - lv2);

    const recent = history.slice(-15);
    const partnerRepeat = recent.some(h =>
      (h.teams.some(t => t.includes(matchIds[0]) && t.includes(matchIds[1]))) ||
      (h.teams.some(t => t.includes(matchIds[2]) && t.includes(matchIds[3])))
    );

    const opponentRepeat = recent.some(h => {
      const isOpp1 = (h.teams[0].includes(matchIds[0]) && h.teams[1].includes(matchIds[2])) || (h.teams[1].includes(matchIds[0]) && h.teams[0].includes(matchIds[2]));
      const isOpp2 = (h.teams[0].includes(matchIds[1]) && h.teams[1].includes(matchIds[3])) || (h.teams[1].includes(matchIds[1]) && h.teams[0].includes(matchIds[3]));
      return isOpp1 && isOpp2;
    });

    return { lv1, lv2, diff, partnerRepeat, opponentRepeat };
  };

  const canAutoAssign = availableCourts.length > 0 && queue.length > 0;

  const handleNormalSchedule = () => {
    if (window.confirm('確定要執行普通智慧排點嗎？')) {
      onNormalSchedule(roundsToSchedule);
    }
  };

  return (
    <div className="bg-white md:rounded-3xl shadow-sm md:border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b bg-slate-50">

        {/* Header - Aligned with Player List Style */}
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="font-black text-2xl text-slate-800 flex items-center gap-2">
            <span>📋</span>
            待上場 ({queue.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
              className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center transition-colors shadow-sm"
              title={isControlsCollapsed ? "展開操作" : "收合操作"}
            >
              {isControlsCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
              )}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 flex items-center justify-center font-bold shadow-sm transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>



        {!isControlsCollapsed && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => setRoundsToSchedule(Math.max(1, roundsToSchedule - 1))}
                  className="w-9 h-9 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 font-bold active:scale-90 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                </button>
                <input
                  type="number"
                  value={roundsToSchedule}
                  onChange={(e) => setRoundsToSchedule(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-10 bg-transparent font-black text-lg text-center text-indigo-600 p-0 border-none focus:ring-0 mx-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [appearance:textfield]"
                />
                <button
                  onClick={() => setRoundsToSchedule(roundsToSchedule + 1)}
                  className="w-9 h-9 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 font-bold active:scale-90 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                </button>
              </div>
              <div className="flex-1 flex gap-2">
                <div className={`flex-1 rounded-xl flex items-stretch overflow-hidden transition-all shadow-md active:scale-95 duration-200 border-2 ${sortAlgorithm === 'ai'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 border-transparent shadow-purple-200'
                  : 'bg-white border-indigo-600 shadow-indigo-100'
                  }`}>
                  {/* Arrow Controls */}
                  <div className={`flex flex-col w-8 border-r ${sortAlgorithm === 'ai'
                    ? 'border-white/20'
                    : 'border-indigo-100'
                    }`}>
                    <button
                      onClick={() => cycleAlgorithm('up')}
                      className={`flex-1 flex items-center justify-center text-[10px] font-black leading-none transition-colors ${sortAlgorithm === 'ai'
                        ? 'text-white/90 hover:bg-white/20'
                        : 'text-indigo-300 hover:bg-indigo-50 hover:text-indigo-600'
                        }`}
                    >▲</button>
                    <button
                      onClick={() => cycleAlgorithm('down')}
                      className={`flex-1 flex items-center justify-center text-[10px] font-black leading-none border-t transition-colors ${sortAlgorithm === 'ai'
                        ? 'text-white/90 hover:bg-white/20 border-white/20'
                        : 'text-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 border-indigo-100'
                        }`}
                    >▼</button>
                  </div>
                  {/* Main Action Area */}
                  <button
                    onClick={() => {
                      // Premium Check
                      const isPremiumAlgo = ['ai', 'mixed', 'avoid_repeat'].includes(sortAlgorithm);
                      if (isPremiumAlgo && !isPro) {
                        if (window.confirm(`「${algorithmLabels[sortAlgorithm]}」僅限付費用戶使用。\n是否前往升級頁面？`)) {
                          onUpgrade();
                        }
                        return;
                      }

                      const label = algorithmLabels[sortAlgorithm];
                      if (window.confirm(`確定要執行「${label}」嗎？`)) {
                        if (sortAlgorithm === 'ai') {
                          onSchedule(roundsToSchedule);
                        } else {
                          (onNormalSchedule as any)(roundsToSchedule, sortAlgorithm);
                        }
                      }
                    }}
                    disabled={isScheduling || allPlayers.length < 4}
                    className={`flex-1 flex flex-col items-center justify-center transition-colors disabled:opacity-50 py-1 ${sortAlgorithm === 'ai' ? 'hover:bg-white/10' : 'hover:bg-indigo-50'
                      }`}
                  >
                    <span className={`font-black text-[15px] leading-tight tracking-wide ${sortAlgorithm === 'ai' ? 'text-white' : 'text-indigo-700'
                      }`}>
                      {algorithmLabels[sortAlgorithm]}
                    </span>
                    <span className={`text-[10px] font-bold mt-0.5 ${sortAlgorithm === 'ai' ? 'text-white/90' : 'text-indigo-400'
                      }`}>
                      {sortAlgorithm === 'ai' ? 'GEMINI POWERED' :
                        sortAlgorithm === 'mixed' ? 'MIXED DOUBLES' :
                          sortAlgorithm === 'avoid_repeat' ? 'AVOID REPEATS' : 'LEVEL BALANCE'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={onAutoAssignAll}
              disabled={!canAutoAssign}
              className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${canAutoAssign
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700'
                : 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              一鍵指派所有空場 {availableCourts.length > 0 && `(剩餘 ${availableCourts.length} 場)`}
            </button>

            <div className="flex gap-2">
              <button
                onClick={onAddBlankMatch}
                className="flex-1 bg-white border-2 border-dashed border-slate-300 text-slate-500 py-2 rounded-xl font-bold text-xs hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"
              >
                + 空白場
              </button>
              <button
                onClick={onManualSchedule}
                disabled={allPlayers.length < 4}
                className="px-4 bg-emerald-600 text-white py-2 rounded-xl font-black text-xs shadow-md hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                +1 智慧場次
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-40 space-y-3 custom-scrollbar relative">
        {swappingIdx && (
          <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <span className="text-lg font-black text-slate-800 flex items-center gap-2">
                  🔄 選擇替換球員
                </span>
                <button onClick={() => setSwappingIdx(null)} className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 flex items-center justify-center font-bold transition-colors">✕</button>
              </div>

              <div className="p-2 overflow-y-auto flex-1 custom-scrollbar space-y-1">
                {selectablePlayers.map(p => {
                  const isSelf = p.id === activeEditingId;
                  const isInMatch = currentMatchIds.includes(p.id) && !isSelf;
                  if (isSelf) return null;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { onSwapPlayer(swappingIdx.qIdx, activeEditingId || "", p.id); setSwappingIdx(null); }}
                      className={`w-full text-left p-4 rounded-2xl border flex items-center justify-between hover:bg-indigo-600 hover:text-white transition-all group ${isInMatch ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-sm ${p.gender === Gender.FEMALE ? 'bg-pink-400' : 'bg-blue-500'}`}>
                          {p.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-base group-hover:text-white text-slate-800">
                            {p.name}
                          </span>
                          <div className="flex gap-1">
                            {playingPlayerIds.has(p.id) && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold group-hover:bg-white/20 group-hover:text-white">對戰中</span>}
                            {busyPlayerIds.has(p.id) && !playingPlayerIds.has(p.id) && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold group-hover:bg-white/20 group-hover:text-white">排隊中</span>}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-black opacity-40 group-hover:opacity-100">L{p.level}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {queue.length === 0 ? (
          <div className="text-center py-20 text-slate-400 italic text-sm">尚未排隊，請點擊上方按鈕排點</div>
        ) : (
          queue.map((match, qIdx) => {
            const analysis = analyzeMatch(match);
            const isExpanded = expandedMatchIdx === qIdx;

            return (
              <div key={qIdx} className={`bg-slate-50 border rounded-2xl p-4 flex flex-col gap-3 group animate-in slide-in-from-right-2 duration-200 transition-all ${isExpanded ? 'ring-2 ring-indigo-500 border-indigo-200 shadow-lg' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">NEXT ROUND {qIdx + 1}</span>
                    <button
                      onClick={() => setExpandedMatchIdx(isExpanded ? null : qIdx)}
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold transition-all ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'}`}
                    >
                      {isExpanded ? '隱藏詳情' : '🔍 詳情'}
                    </button>
                    {availableCourts.length > 0 && !isExpanded && (
                      <div className="flex gap-1">
                        {availableCourts.map(c => {
                          const busyInMatch = match.filter(pid => playingPlayerIds.has(pid));
                          const isMatchBusy = busyInMatch.length > 0;
                          return (
                            <button
                              key={c.id}
                              onClick={() => {
                                if (isMatchBusy) {
                                  const names = busyInMatch.map(id => allPlayers.find(p => p.id === id)?.name || id).join(', ');
                                  alert(`無法排入：球員 ${names} 目前正在場上對戰中！`);
                                  return;
                                }
                                onAssignToCourt(c.id, qIdx);
                              }}
                              className={`text-[8px] font-black px-1.5 py-0.5 rounded transition-colors ${isMatchBusy
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                                }`}
                            >
                              至 {c.name.replace('場地 ', '')} {isMatchBusy && '(忙碌)'}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onReorder(qIdx, 'up')} disabled={qIdx === 0} className="text-slate-400 hover:text-indigo-600 disabled:opacity-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => onReorder(qIdx, 'down')} disabled={qIdx === queue.length - 1} className="text-slate-400 hover:text-indigo-600 disabled:opacity-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => onRemove(qIdx)} className="text-slate-300 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <div className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">隊伍 A (LV: {analysis.lv1})</div>
                      <div className={`px-2 py-0.5 rounded-lg ${analysis.diff <= 2 ? 'bg-emerald-50 text-emerald-600' : analysis.diff >= 5 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
                        強度差: {analysis.diff} ({analysis.diff <= 2 ? '勢均力敵' : analysis.diff >= 5 ? '落差大' : '尚可'})
                      </div>
                      <div className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">隊伍 B (LV: {analysis.lv2})</div>
                    </div>

                    <div className="flex items-center justify-around gap-2 text-sm">
                      <div className="flex flex-col gap-1 flex-1">
                        {[match[0], match[1]].map(id => {
                          const p = allPlayers.find(x => x.id === id);
                          const isBusy = playingPlayerIds.has(id);
                          return (
                            <div key={id} className={`p-2 rounded-lg font-bold text-center break-words ${isBusy ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-slate-50'}`}>
                              {p?.name || '?'}
                              {isBusy && <span className="text-xs ml-1">(戰)</span>}
                            </div>
                          );
                        })}
                      </div>
                      <div className="font-black text-slate-300 italic text-xl">VS</div>
                      <div className="flex flex-col gap-1 flex-1">
                        {[match[2], match[3]].map(id => {
                          const p = allPlayers.find(x => x.id === id);
                          const isBusy = playingPlayerIds.has(id);
                          return (
                            <div key={id} className={`p-2 rounded-lg font-bold text-center break-words ${isBusy ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-slate-50'}`}>
                              {p?.name || '?'}
                              {isBusy && <span className="text-xs ml-1">(戰)</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                      {analysis.partnerRepeat && <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-black">搭檔重複過</span>}
                      {analysis.opponentRepeat && <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-black">對戰重複過</span>}
                      {!analysis.partnerRepeat && !analysis.opponentRepeat && <span className="text-[9px] bg-green-100 text-green-600 px-2 py-0.5 rounded font-black">全新組合 ✨</span>}
                    </div>

                    {availableCourts.length > 0 && (
                      <div className="pt-1 flex gap-2">
                        {availableCourts.map(c => (
                          <button
                            key={c.id}
                            onClick={() => onAssignToCourt(c.id, qIdx)}
                            className="flex-1 bg-emerald-600 text-white text-[10px] font-black py-2 rounded-lg hover:bg-emerald-700 shadow-sm"
                          >
                            指派至 {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className={`grid grid-cols-2 gap-1 ${isExpanded ? 'hidden' : ''}`}>
                  {match.map((pid, pIdx) => {
                    const p = allPlayers.find(x => x.id === pid);
                    if (!pid) {
                      return (
                        <div
                          key={pIdx}
                          onClick={() => handleStartSwap(qIdx, pIdx)}
                          className="bg-white border-2 border-dashed border-slate-200 p-2 rounded-xl cursor-pointer hover:border-indigo-400 transition-colors flex items-center gap-2 group/item"
                        >
                          <div className="w-6 h-6 rounded-full border-2 border-slate-100 flex-shrink-0 flex items-center justify-center text-[10px] text-slate-300 group-hover/item:text-indigo-400">?</div>
                          <span className="text-[10px] font-bold text-slate-300 group-hover/item:text-indigo-400 italic">點擊選人</span>
                        </div>
                      );
                    }
                    return (
                      <div key={pIdx} onClick={() => handleStartSwap(qIdx, pIdx)} className="bg-white border border-slate-100 p-2 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white ${p?.gender === Gender.FEMALE ? 'bg-pink-400' : 'bg-blue-400'}`}>{p?.name.charAt(0)}</div>
                          <span className="text-sm font-bold text-slate-800 break-words leading-tight">{p?.name || '未知'}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 flex-shrink-0 ml-1">L.{p?.level}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MatchQueue;
