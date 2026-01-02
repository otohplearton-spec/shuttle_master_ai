import React from 'react';

interface SwapChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (targetRoundIndex: number | null) => void;
    playerName: string;
    existingRounds: number[];
}

const SwapChoiceModal: React.FC<SwapChoiceModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    playerName,
    existingRounds,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6">
                    <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                        <span className="text-amber-500 text-2xl">⚠️</span>
                        球員重複警告
                    </h3>

                    <p className="text-slate-600 mb-6 font-bold leading-relaxed">
                        球員 <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{playerName}</span>
                        <br />已經排在以下場次中：
                    </p>

                    <div className="space-y-3">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">選擇交換對象</div>

                        {existingRounds.map(roundNum => (
                            <button
                                key={roundNum}
                                onClick={() => onConfirm(roundNum - 1)} // Convert 1-based round to 0-based index
                                className="w-full bg-white border-2 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 p-4 rounded-xl flex items-center justify-between group transition-all"
                            >
                                <span className="font-bold">與 第 {roundNum} 組 交換</span>
                                <span className="text-indigo-300 group-hover:text-indigo-600 font-bold transition-colors">⇄</span>
                            </button>
                        ))}

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-bold">或</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        <button
                            onClick={() => onConfirm(null)} // Standard Replace
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-xl font-bold flex items-center justify-between transition-all"
                        >
                            <span>直接替換 (不交換)</span>
                            <span className="text-xs opacity-50 font-normal">場上與隊列將同時存在</span>
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 flex justify-center">
                    <button
                        onClick={onClose}
                        className="text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm"
                    >
                        取消操作
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SwapChoiceModal;
