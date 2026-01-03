
import React, { useState } from 'react';
import { Player, Gender, MatchHistory, Court } from '../types';
import { getAvatarLevelClasses } from '../utils/levelStyles';

interface PlayerListProps {
  players: Player[];
  courts: Court[];
  matchQueue: string[][];
  history: MatchHistory[];
  playingPlayerIds: Set<string>;
  queuedPlayerIds: Set<string>;
  onDelete: (id: string) => void;
  onUpdateLevel: (id: string, newLevel: number) => void;
  onUpdateTargetGames: (id: string, newTarget: number) => void;
  onTogglePause: (id: string) => void;
}

const PlayerList: React.FC<PlayerListProps> = ({
  players,
  courts,
  matchQueue,
  history,
  playingPlayerIds,
  queuedPlayerIds,
  onDelete,
  onUpdateLevel,
  onUpdateTargetGames,
  onTogglePause
}) => {
  const [selectedPlayerHistory, setSelectedPlayerHistory] = useState<string | null>(null);

  // 動態計算「總計分配場次」
  const getQueuedCount = (playerId: string) => {
    let count = 0;
    courts.forEach(c => {
      if (c.isActive && c.players.includes(playerId)) {
        count++;
      }
    });
    matchQueue.forEach(match => {
      if (match.includes(playerId)) {
        count++;
      }
    });
    return count;
  };

  // 獲取歷史數據
  const getPlayerStats = (playerId: string) => {
    const partners = new Map<string, number>();
    const opponents = new Map<string, number>();

    history.forEach(match => {
      if (!match.players.includes(playerId)) return;
      const myTeam = match.teams.find(t => t.includes(playerId));
      const otherTeam = match.teams.find(t => !t.includes(playerId));
      myTeam?.forEach(p => { if (p !== playerId) partners.set(p, (partners.get(p) || 0) + 1); });
      otherTeam?.forEach(p => { opponents.set(p, (opponents.get(p) || 0) + 1); });
    });

    return {
      partners: Array.from(partners.entries()).sort((a, b) => b[1] - a[1]),
      opponents: Array.from(opponents.entries()).sort((a, b) => b[1] - a[1])
    };
  };

  // 獲取「預計」對戰數據 (包含正在場上的 + 隊列中的)
  const getUpcomingStats = (playerId: string) => {
    const partners = new Map<string, number>();
    const opponents = new Map<string, number>();

    // 1. 檢查場地上進行中的
    courts.forEach(c => {
      if (c.isActive && c.players.includes(playerId)) {
        const pIds = c.players;
        const myTeamIdx = pIds.indexOf(playerId) < 2 ? [0, 1] : [2, 3];
        const otherTeamIdx = pIds.indexOf(playerId) < 2 ? [2, 3] : [0, 1];

        myTeamIdx.forEach(idx => {
          if (pIds[idx] !== playerId && pIds[idx]) partners.set(pIds[idx], (partners.get(pIds[idx]) || 0) + 1);
        });
        otherTeamIdx.forEach(idx => {
          if (pIds[idx]) opponents.set(pIds[idx], (opponents.get(pIds[idx]) || 0) + 1);
        });
      }
    });

    // 2. 檢查隊列中的
    matchQueue.forEach(match => {
      if (match.includes(playerId)) {
        const pIdx = match.indexOf(playerId);
        const myTeamIdx = pIdx < 2 ? [0, 1] : [2, 3];
        const otherTeamIdx = pIdx < 2 ? [2, 3] : [0, 1];

        myTeamIdx.forEach(idx => {
          if (match[idx] !== playerId && match[idx]) partners.set(match[idx], (partners.get(match[idx]) || 0) + 1);
        });
        otherTeamIdx.forEach(idx => {
          if (match[idx]) opponents.set(match[idx], (opponents.get(match[idx]) || 0) + 1);
        });
      }
    });

    return {
      partners: Array.from(partners.entries()).sort((a, b) => b[1] - a[1]),
      opponents: Array.from(opponents.entries()).sort((a, b) => b[1] - a[1])
    };
  };

  // 排序球員
  const sortedPlayers = [...players].sort((a, b) => {
    const gamesA = a.gamesPlayed + getQueuedCount(a.id);
    const gamesB = b.gamesPlayed + getQueuedCount(b.id);
    if (gamesA !== gamesB) return gamesA - gamesB;
    return b.level - a.level;
  });

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
      <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
          </span>
          球友狀態 ({players.length})
        </div>
      </h2>
      <div className="overflow-y-auto flex-1 space-y-2 pr-2 pb-40 custom-scrollbar">
        {players.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">尚未加入球友</div>}
        {sortedPlayers.map((player) => {
          const isPlaying = playingPlayerIds.has(player.id);
          const isQueued = queuedPlayerIds.has(player.id);
          const totalAssignedCount = getQueuedCount(player.id);
          const totalGames = player.gamesPlayed + totalAssignedCount;

          // 獲取「下一場」搭檔與對手
          const getNextMatch = (playerId: string) => {
            const queueIndex = matchQueue.findIndex(m => m.includes(playerId));
            if (queueIndex === -1) return null;
            const nextMatch = matchQueue[queueIndex];

            const pIdx = nextMatch.indexOf(playerId);
            const isTeam1 = pIdx < 2;
            const partnerId = isTeam1 ? nextMatch[pIdx === 0 ? 1 : 0] : nextMatch[pIdx === 2 ? 3 : 2];
            const opponentIds = isTeam1 ? [nextMatch[2], nextMatch[3]] : [nextMatch[0], nextMatch[1]];

            return {
              roundNumber: queueIndex + 1,
              partner: players.find(p => p.id === partnerId),
              opponents: opponentIds.map(id => players.find(p => p.id === id))
            };
          };

          const nextMatchInfo = getNextMatch(player.id);

          const isPaused = player.isPaused;

          return (
            <div key={player.id} className={`flex flex-col p-4 rounded-xl border transition-all ${isPaused ? 'bg-slate-50 border-slate-100 opacity-60 grayscale-[0.8]' : isPlaying ? 'bg-blue-50 border-blue-200 shadow-sm' : isQueued ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0 ${player.gender === Gender.FEMALE ? 'bg-pink-400' : 'bg-blue-400'} ${getAvatarLevelClasses(player.level)}`}>
                    {player.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="truncate">{player.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${isPaused ? 'bg-slate-200 text-slate-500' : isPlaying ? 'bg-blue-600 text-white' : isQueued ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {isPaused ? '暫離中' : isPlaying ? '對戰中' : isQueued ? '排隊中' : '休息中'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => onTogglePause(player.id)} className={`p-2 transition-colors rounded-lg ${isPaused ? 'text-slate-500 hover:text-green-600 bg-slate-200 hover:bg-green-100' : 'text-slate-300 hover:text-amber-500'}`} title={isPaused ? "點擊歸隊" : "暫停排程(暫離)"}>
                    {isPaused ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    )}
                  </button>
                  <button onClick={() => setSelectedPlayerHistory(selectedPlayerHistory === player.id ? null : player.id)} className={`p-2 transition-colors rounded-lg ${selectedPlayerHistory === player.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-indigo-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  </button>
                  <button onClick={() => onDelete(player.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-400 text-[10px] uppercase">LV</span>
                    <button onClick={() => onUpdateLevel(player.id, player.level - 1)} className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-500">-</button>
                    <span className="w-4 text-center font-bold text-slate-700 text-xs">{player.level}</span>
                    <button onClick={() => onUpdateLevel(player.id, player.level + 1)} className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-500">+</button>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] font-bold">
                    <div className="flex flex-col items-center">
                      <span className="text-slate-400 uppercase tracking-tighter">已打</span>
                      <span className="text-slate-700 text-sm leading-none">{player.gamesPlayed}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-slate-400 uppercase tracking-tighter">已排</span>
                      <span className="text-amber-600 text-sm leading-none">{totalAssignedCount}</span>
                    </div>
                    <div className="flex flex-col items-center border-l pl-3 group/target cursor-default">
                      <span className="text-slate-400 uppercase tracking-tighter">總進度</span>
                      <div className="flex items-center gap-0.5 relative">
                        <span className={`text-sm font-black leading-none ${totalGames >= (player.targetGames || 6) ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {totalGames}
                        </span>
                        <span className="text-xs text-slate-300 font-light">/</span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); onUpdateTargetGames(player.id, Math.max(1, (player.targetGames || 6) - 1)); }}
                            className="w-4 h-4 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 text-[10px] md:opacity-0 md:group-hover/target:opacity-100 transition-opacity"
                          >-</button>

                          <span className="text-xs font-bold text-slate-600 min-w-[12px] text-center">{player.targetGames || 6}</span>

                          <button
                            onClick={(e) => { e.stopPropagation(); onUpdateTargetGames(player.id, (player.targetGames || 6) + 1); }}
                            className="w-4 h-4 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 text-[10px] md:opacity-0 md:group-hover/target:opacity-100 transition-opacity"
                          >+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {totalAssignedCount > 0 && (
                  <div className="flex gap-1 mt-1 justify-end">
                    {Array.from({ length: totalAssignedCount }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                    ))}
                  </div>
                )}
              </div>

              {selectedPlayerHistory === player.id && (
                <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  {/* 下一場對戰詳情 */}
                  {nextMatchInfo && (
                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200">
                      <h4 className="text-[10px] font-black text-indigo-700 uppercase mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></span>
                          即將上場 (Next Match)
                        </span>
                        <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[9px]">
                          Round {nextMatchInfo.roundNumber}
                        </span>
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[9px] font-bold text-indigo-600/70 block mb-1">搭檔</span>
                          <div className="text-[10px] font-bold text-slate-700">
                            {nextMatchInfo.partner?.name || <span className="text-slate-400 italic">空缺</span>}
                          </div>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-indigo-600/70 block mb-1">對手</span>
                          <div className="text-[10px] font-bold text-slate-700">
                            {nextMatchInfo.opponents.map(p => p?.name).filter(Boolean).join(' & ') || <span className="text-slate-400 italic">空缺</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 預計對戰 (累積統計) */}
                  {totalAssignedCount > 0 && (
                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                      <h4 className="text-[10px] font-black text-amber-700 uppercase mb-2 flex items-center gap-1">
                        <span className="w-1 h-1 bg-amber-500 rounded-full animate-ping"></span>
                        預計對戰 (已排隊)
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[9px] font-bold text-amber-600/70 block mb-1">預計搭檔</span>
                          <div className="space-y-1">
                            {getUpcomingStats(player.id).partners.map(([id, count]) => (
                              <div key={id} className="text-[10px] flex justify-between">
                                <span className="text-slate-600 truncate mr-1 font-bold">{players.find(p => p.id === id)?.name}</span>
                                <span className="font-black text-amber-600/50 flex-shrink-0">{count}次</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-amber-600/70 block mb-1">預計對手</span>
                          <div className="space-y-1">
                            {getUpcomingStats(player.id).opponents.map(([id, count]) => (
                              <div key={id} className="text-[10px] flex justify-between">
                                <span className="text-slate-600 truncate mr-1 font-bold">{players.find(p => p.id === id)?.name}</span>
                                <span className="font-black text-amber-600/50 flex-shrink-0">{count}次</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 歷史對戰紀錄 */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-indigo-100">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase mb-2">歷史戰績分析</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block mb-1">最佳搭檔</span>
                        <div className="space-y-1">
                          {getPlayerStats(player.id).partners.slice(0, 3).map(([id, count]) => (
                            <div key={id} className="text-[10px] flex justify-between">
                              <span className="text-slate-600 truncate mr-1">{players.find(p => p.id === id)?.name}</span>
                              <span className="font-black text-slate-400 flex-shrink-0">{count}次</span>
                            </div>
                          ))}
                          {getPlayerStats(player.id).partners.length === 0 && <span className="text-[9px] text-slate-300 italic">尚無數據</span>}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block mb-1">強勁對手</span>
                        <div className="space-y-1">
                          {getPlayerStats(player.id).opponents.slice(0, 3).map(([id, count]) => (
                            <div key={id} className="text-[10px] flex justify-between">
                              <span className="text-slate-600 truncate mr-1">{players.find(p => p.id === id)?.name}</span>
                              <span className="font-black text-slate-400 flex-shrink-0">{count}次</span>
                            </div>
                          ))}
                          {getPlayerStats(player.id).opponents.length === 0 && <span className="text-[9px] text-slate-300 italic">尚無數據</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerList;
