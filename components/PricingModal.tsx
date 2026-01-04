import React, { useState } from 'react';

export interface PricingPlan {
    id: string;
    name: string;
    price: number;
    days: number;
    label: string;
    tag?: string;
}

const PLANS: PricingPlan[] = [
    { id: 'month', name: '月繳方案 (30天)', price: 30, days: 30, label: '極致彈性' },
    { id: 'quarter', name: '季繳方案 (90天)', price: 90, days: 90, label: '標準選擇' },
    { id: 'year', name: '年繳方案 (365天)', price: 300, days: 365, label: '現省 $60', tag: 'BEST VALUE' },
];

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPlan: (plan: PricingPlan) => void;
    isLoading: boolean;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onSelectPlan, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={!isLoading ? onClose : undefined}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-center text-white">
                    <h2 className="text-2xl font-black mb-1">升級 PRO 會員 👑</h2>
                    <p className="text-indigo-100 text-sm">解鎖無限場地與更多進階功能</p>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-4">
                    {PLANS.map((plan) => (
                        <button
                            key={plan.id}
                            disabled={isLoading}
                            onClick={() => onSelectPlan(plan)}
                            className={`w-full group relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all
                  ${plan.tag ? 'border-indigo-600 bg-indigo-50/50 hover:bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                        >
                            {plan.tag && (
                                <span className="absolute -top-3 left-4 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                    {plan.tag}
                                </span>
                            )}

                            <div className="text-left">
                                <div className="text-xs text-slate-400 font-bold mb-0.5">{plan.label}</div>
                                <div className="text-lg font-black text-slate-800">{plan.name}</div>
                            </div>

                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-indigo-600">${plan.price}</span>
                                <span className="text-xs text-slate-400 font-bold">TWD</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer / Loading Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-indigo-600 font-bold animate-pulse">正在建立訂單...</p>
                    </div>
                )}

                {!isLoading && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/50 hover:text-white p-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default PricingModal;
