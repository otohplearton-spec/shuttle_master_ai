import React from 'react';
import { createPortal } from 'react-dom';

interface EndSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClearHistoryOnly: () => void;
    onClearAll: () => void;
}

const EndSessionModal: React.FC<EndSessionModalProps> = ({
    isOpen,
    onClose,
    onClearHistoryOnly,
    onClearAll,
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border-4 border-slate-200">
                <div className="p-6 border-b bg-slate-50 flex flex-col items-center text-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl mb-2">
                        🛑
                    </div>
                    <h3 className="text-2xl font-black text-slate-800">
                        結束本次活動
                    </h3>
                    <p className="text-slate-500 font-bold text-sm">
                        請選擇您要如何結束這次的活動
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    <button
                        onClick={onClearHistoryOnly}
                        className="w-full bg-white border-2 border-indigo-500 text-indigo-600 p-4 rounded-2xl font-black text-lg hover:bg-indigo-50 transition-all shadow-sm flex items-center gap-4 group text-left"
                    >
                        <span className="text-2xl group-hover:scale-110 transition-transform">🧹</span>
                        <div className="flex flex-col">
                            <span>僅清除紀錄</span>
                            <span className="text-xs font-normal opacity-70">保留球員名單，重置對戰場次</span>
                        </div>
                    </button>

                    <button
                        onClick={onClearAll}
                        className="w-full bg-red-500 text-white p-4 rounded-2xl font-black text-lg hover:bg-red-600 transition-all shadow-lg flex items-center gap-4 group text-left"
                    >
                        <span className="text-2xl group-hover:scale-110 transition-transform">💥</span>
                        <div className="flex flex-col">
                            <span>完全結束 (清除所有)</span>
                            <span className="text-xs font-normal opacity-70">清除所有球員與紀錄，回到首頁</span>
                        </div>
                    </button>
                </div>

                <div className="p-4 border-t bg-slate-50">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EndSessionModal;
