import React, { useState } from 'react';

interface AiSortInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (instruction: string, count: number) => void;
    isGenerating: boolean;
    errorMessage?: string | null;
    defaultMatchCount?: number;
}

const SUGGESTIONS = [
    "強弱平均分配 (Mix Levels)",
    "男雙女雙分開 (Separate Genders)",
    "盡量不重複組合 (Avoid Repeats)",
    "讓場上的人都實力相當 (Balanced Games)"
];

const AiSortInputModal: React.FC<AiSortInputModalProps> = ({ isOpen, onClose, onSubmit, isGenerating, errorMessage, defaultMatchCount = 2 }) => {
    const [instruction, setInstruction] = useState('');
    const [matchCount, setMatchCount] = useState(defaultMatchCount);

    // Sync matchCount when default changes or when opening
    React.useEffect(() => {
        if (isOpen) setMatchCount(defaultMatchCount);
    }, [isOpen, defaultMatchCount]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={!isGenerating ? onClose : undefined} />

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center">
                    <div className="text-4xl mb-2">✨</div>
                    <h2 className="text-xl font-black">AI 智慧排點 (Gemini)</h2>
                    <p className="text-indigo-100 text-sm">告訴 AI 您想怎麼安排這場比賽</p>
                </div>

                <div className="p-6">
                    <textarea
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="例如：把強的人排在一起、或是要混雙..."
                        className="w-full h-32 p-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-700 resize-none mb-4"
                        autoFocus
                    />

                    <div className="flex items-center gap-4 mb-4">
                        <label className="text-sm font-bold text-slate-600 whitespace-nowrap">預計場次 (Match Count):</label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setMatchCount(Math.max(1, matchCount - 1))}
                                disabled={isGenerating}
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-black text-slate-500 transition-colors"
                            >-</button>
                            <input
                                type="number"
                                value={matchCount}
                                onChange={(e) => setMatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 h-8 text-center font-black text-slate-700 bg-slate-50 rounded-lg border focus:border-indigo-500 outline-none"
                                disabled={isGenerating}
                            />
                            <button
                                onClick={() => setMatchCount(matchCount + 1)}
                                disabled={isGenerating}
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-black text-slate-500 transition-colors"
                            >+</button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                        {SUGGESTIONS.map(s => (
                            <button
                                key={s}
                                onClick={() => setInstruction(s)}
                                disabled={isGenerating}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold rounded-lg transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {errorMessage && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 flex items-start gap-2">
                            <span>⚠️</span>
                            <span className="break-all">{errorMessage}</span>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isGenerating}
                            className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={() => onSubmit(instruction, matchCount)}
                            disabled={isGenerating || !instruction.trim()}
                            className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>AI 思考中...</span>
                                </>
                            ) : (
                                <>
                                    <span>🤖 開始排點</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiSortInputModal;
