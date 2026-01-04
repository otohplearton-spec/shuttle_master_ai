
import React, { useState } from 'react';
import { Court, Player, Gender } from '../types';
import { getAvatarLevelClasses } from '../utils/levelStyles';

interface CourtCardProps {
  court: Court;
  allPlayers: Player[];
  busyPlayerIds: Set<string>;
  playingPlayerIds: Set<string>;
  onEndMatch: (courtId: string) => void;
  onSwapPlayer: (courtId: string, oldPlayerId: string, newPlayerId: string) => void;
  onReplayBroadcast: (courtId: string) => void;
  onRemoveCourt: (courtId: string) => void;
  onUpdateName: (courtId: string, newName: string) => void;
  matchQueueCount: number;
  onAssignNext: () => void;
  nextMatch: string[] | undefined;
  onCancelMatch: (courtId: string) => void;
}

const MatchTimer: React.FC<{ startTime?: number }> = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);

  React.useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    setElapsed(Math.floor((Date.now() - startTime) / 1000)); // Initial update
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');

  return <span>{mins}:{secs}</span>;
};

const CourtCard: React.FC<CourtCardProps> = ({
  court, allPlayers, busyPlayerIds, playingPlayerIds, onEndMatch, onSwapPlayer, onReplayBroadcast, onRemoveCourt, onUpdateName, matchQueueCount, onAssignNext, nextMatch, onCancelMatch
}) => {
  const [swappingIdx, setSwappingIdx] = useState<number | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(court.name);

  const activeEditingPlayerId = swappingIdx !== null ? court.players[swappingIdx] : null;

  const selectablePlayers = [...allPlayers].sort((a, b) => {
    const aInMatch = court.players.includes(a.id) ? 1 : 0;
    const bInMatch = court.players.includes(b.id) ? 1 : 0;
    if (aInMatch !== bInMatch) return bInMatch - aInMatch;
    return b.level - a.level;
  });

  const handleNameSubmit = () => {
    onUpdateName(court.id, tempName);
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameSubmit();
    if (e.key === 'Escape') {
      setTempName(court.name);
      setIsEditingName(false);
    }
  };

  return (
    <div className={`bg-white rounded-3xl shadow-lg border border-slate-200 flex flex-col h-auto mb-4 relative transition-none ${swappingIdx !== null ? 'z-[50]' : 'z-0'}`}>
      <div className="bg-slate-800 p-2 md:p-4 text-white flex justify-between items-center group/header shrink-0 rounded-t-3xl">
        <div className="flex items-center gap-3 flex-1">
          <div className="bg-indigo-500 p-1.5 md:p-2 rounded-lg flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.535 5.503a1 1 0 101.07 1.683c.852-.54 2.117-.824 3.465-.824s2.613.284 3.465.824a1 1 0 001.07-1.683C14.306 13.05 12.585 12.5 10.5 12.5s-3.806.55-5.035 1.503z" clipRule="evenodd" /></svg>
          </div>

          {isEditingName ? (
            <input
              autoFocus
              className="bg-slate-700 text-white font-bold text-lg md:text-xl px-2 py-0.5 rounded outline-none border-b-2 border-indigo-400 w-full"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-slate-700 px-2 py-0.5 rounded transition-colors w-full overflow-hidden"
              onClick={() => { setIsEditingName(true); setTempName(court.name); }}
            >
              <h3 className="text-sm md:text-xl font-bold truncate">{court.name}</h3>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-0 group-hover/header:opacity-50 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </div>
          )}
        </div>
        <button onClick={() => onRemoveCourt(court.id)} className="text-slate-400 hover:text-white transition-colors ml-2">✕</button>
      </div>

      <div className="bg-[#2e7d32] p-2 md:p-6 relative flex flex-col items-center justify-center flex-auto shrink-0 w-full min-h-[350px] md:min-h-[380px]">
        <div className="absolute inset-4 border-2 border-white/30 pointer-events-none z-0">
          <div className="absolute top-1/2 left-0 w-full h-px bg-white/40 -translate-y-1/2"></div>
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/30 -translate-x-1/2"></div>
        </div>

        {court.isActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase animate-pulse shadow-xl">正在比賽</span>
            <div className="bg-black/40 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border border-white/20">
              <MatchTimer startTime={court.startTime} />
            </div>
            <button onClick={() => onReplayBroadcast(court.id)} title="重新廣播" className="bg-white/90 p-1 rounded-full text-indigo-600 shadow-md hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.983 3.983 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" /></svg></button>
          </div>
        )}

        {swappingIdx !== null && (
          <div className="fixed inset-0 z-[60] bg-white md:bg-slate-900/60 md:backdrop-blur-sm md:flex md:items-center md:justify-center md:p-4 animate-in fade-in duration-200">
            <div className="w-full h-full md:bg-white md:w-full md:max-w-md md:rounded-2xl md:shadow-2xl md:max-h-[90%] md:border-4 md:border-indigo-500 overflow-hidden flex flex-col">
              <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
                <span className="text-sm md:text-base font-black text-slate-500 uppercase">更換球員</span>
                <button onClick={() => setSwappingIdx(null)} className="text-slate-400 font-bold p-1">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                {selectablePlayers.map(p => {
                  const isSelf = p.id === activeEditingPlayerId;
                  const isInMatch = court.players.includes(p.id) && !isSelf;
                  if (isSelf) return null;
                  return (
                    <button key={p.id} onClick={() => { onSwapPlayer(court.id, activeEditingPlayerId!, p.id); setSwappingIdx(null); }} className={`w-full text-left p-3 rounded-xl border flex items-center justify-between hover:bg-indigo-600 hover:text-white transition-all ${isInMatch ? 'bg-indigo-50 border-indigo-200' : 'bg-white'}`}>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-base md:text-lg">{p.name}</span>
                        {busyPlayerIds.has(p.id) && !court.players.includes(p.id) && <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold w-fit">已在忙碌中</span>}
                      </div>
                      <span className="text-xs md:text-sm font-black opacity-60">L{p.level}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 w-full flex flex-col items-stretch">
          {!court.isActive ? (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center py-6 px-4 bg-black/20 rounded-2xl backdrop-blur-sm border border-white/10 text-white/70 italic text-sm">
                目前閒置中
              </div>
              {matchQueueCount > 0 ? (
                <button
                  onClick={onAssignNext}
                  className="bg-white text-emerald-700 px-6 py-3 rounded-2xl font-black shadow-2xl hover:bg-emerald-50 transition-all active:scale-95 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                  指派下一組上場
                  {nextMatch && nextMatch.some(id => playingPlayerIds.has(id)) && <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded ml-1 animate-pulse">忙碌</span>}
                </button>
              ) : (
                <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">請先在右側進行排點</div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {court.players.map((pid, idx) => {
                const p = allPlayers.find(x => x.id === pid);
                return (
                  <div key={idx} className="bg-white/95 rounded-xl p-2 md:p-3 flex flex-col items-center justify-between text-center cursor-pointer hover:bg-indigo-50 transition-all shadow-lg h-full min-h-[140px]" onClick={() => setSwappingIdx(idx)}>
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-white text-sm md:text-base mb-1 ${p?.gender === Gender.FEMALE ? 'bg-pink-400' : 'bg-blue-400'} ${getAvatarLevelClasses(p?.level || 0)}`}>{p?.name.charAt(0)}</div>
                    <div className="flex-1 flex items-center justify-center w-full min-h-[2.5rem]">
                      <div className="font-bold text-slate-800 text-sm md:text-base break-words w-full leading-tight line-clamp-2">{p?.name || '未知'}</div>
                    </div>
                    <div className="text-xs text-slate-500 font-bold hidden md:block mt-1">LV.{p?.level} | {p?.gamesPlayed}場</div>
                    <div className="text-[10px] text-slate-500 font-bold md:hidden mt-0.5">L{p?.level} {p?.gamesPlayed}場</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t shrink-0 rounded-b-3xl min-h-[84px] flex flex-col justify-center">
        {court.isActive && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirm('確定要取消這場比賽？球員將會回到隊列最前方。')) {
                  onCancelMatch(court.id);
                }
              }}
              className="px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
              title="取消比賽並返回隊列"
            >
              取消
            </button>
            <button onClick={() => onEndMatch(court.id)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-black shadow-lg hover:bg-slate-900 transition-all active:scale-95">結束比賽</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourtCard;
