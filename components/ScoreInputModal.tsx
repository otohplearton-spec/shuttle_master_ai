import React, { useState } from 'react';
import { Player } from '../types';

interface ScoreInputModalProps {
    ids: string[]; // [p1, p2, p3, p4]
    allPlayers: Player[];
    onConfirm: (score: [number, number]) => void;
    onCancel: () => void;
    onSkip: () => void;
}

const ScoreInputModal: React.FC<ScoreInputModalProps> = ({ ids, allPlayers, onConfirm, onCancel, onSkip }) => {
    const [score1, setScore1] = useState<string>('21');
    const [score2, setScore2] = useState<string>('21');

    const getNames = (pIds: string[]) => {
        return pIds.map(id => allPlayers.find(p => p.id === id)?.name || '?').join(' & ');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const s1 = parseInt(score1) || 0;
        const s2 = parseInt(score2) || 0;
        onConfirm([s1, s2]);
    };

    return (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        🏆 比賽結果登錄
                    </h2>
                    <button onClick={onCancel} className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 flex items-center justify-center font-bold">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    <div className="flex items-center justify-between gap-4">
                        {/* Team 1 */}
                        <div className="flex-1 flex flex-col items-center gap-2">
                            <div className="h-16 w-full bg-indigo-50 rounded-2xl flex items-center justify-center border-2 border-indigo-100 p-2 text-center">
                                <span className="text-sm font-bold text-indigo-800 leading-tight block w-full px-1">
                                    {getNames([ids[0], ids[1]])}
                                </span>
                            </div>
                            <input
                                autoFocus
                                type="number"
                                min="0"
                                value={score1}
                                onChange={(e) => setScore1(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="w-20 h-20 text-4xl font-black text-center bg-indigo-600 text-white rounded-2xl shadow-lg outline-none focus:ring-4 focus:ring-indigo-300 transition-all"
                            />
                        </div>

                        <span className="text-4xl font-black text-slate-200 italic">VS</span>

                        {/* Team 2 */}
                        <div className="flex-1 flex flex-col items-center gap-2">
                            <div className="h-16 w-full bg-amber-50 rounded-2xl flex items-center justify-center border-2 border-amber-100 p-2 text-center">
                                <span className="text-sm font-bold text-amber-800 leading-tight block w-full px-1">
                                    {getNames([ids[2], ids[3]])}
                                </span>
                            </div>
                            <input
                                type="number"
                                min="0"
                                value={score2}
                                onChange={(e) => setScore2(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="w-20 h-20 text-4xl font-black text-center bg-amber-500 text-white rounded-2xl shadow-lg outline-none focus:ring-4 focus:ring-amber-300 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            type="submit"
                            className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-slate-900 transition-all active:scale-95"
                        >
                            確認記錄
                        </button>
                        <button
                            type="button"
                            onClick={onSkip}
                            className="w-full py-3 bg-white text-slate-400 rounded-2xl font-bold border-2 border-slate-100 hover:border-slate-300 hover:text-slate-600 transition-all"
                        >
                            略過計分 (僅結束)
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScoreInputModal;
