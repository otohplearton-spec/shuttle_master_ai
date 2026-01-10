import React, { useState } from 'react';
import { Promotion } from '../types';

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
    onRedeemCode?: (code: string) => Promise<boolean>;
    isLoading: boolean;
    activePromotion?: Promotion | null;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onSelectPlan, onRedeemCode, isLoading, activePromotion }) => {
    const [invitationCode, setInvitationCode] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);

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
                    {PLANS.map((plan) => {
                        const isPromo = activePromotion && activePromotion.planId === plan.id;
                        const displayPrice = isPromo ? activePromotion.salePrice : plan.price;

                        // Calculate dynamic savings label
                        let displayLabel = plan.label;
                        if (isPromo && plan.id === 'year') {
                            const savings = 360 - activePromotion.salePrice;
                            displayLabel = `狂省 $${savings}`;
                        }

                        return (
                            <button
                                key={plan.id}
                                disabled={isLoading}
                                onClick={() => onSelectPlan({ ...plan, price: displayPrice })}
                                className={`w-full group relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all
                  ${(plan.tag || isPromo) ? 'border-indigo-600 bg-indigo-50/50 hover:bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                            >
                                {(plan.tag || isPromo) && (
                                    <span className={`absolute -top-3 left-4 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm ${isPromo ? 'bg-red-500' : 'bg-indigo-600'}`}>
                                        {isPromo ? activePromotion.label : plan.tag}
                                    </span>
                                )}

                                <div className="text-left">
                                    <div className={`text-xs font-bold mb-0.5 ${isPromo ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                                        {displayLabel}
                                    </div>
                                    <div className="text-lg font-black text-slate-800">{plan.name}</div>
                                </div>

                                <div className="flex flex-col items-end">
                                    {isPromo && (
                                        <span className="text-xs font-bold text-slate-400 line-through decoration-red-500 decoration-2">
                                            ${plan.price}
                                        </span>
                                    )}
                                    <div className={`flex items-baseline gap-1 ${isPromo ? 'text-red-600' : 'text-indigo-600'}`}>
                                        <span className="text-2xl font-black">${displayPrice}</span>
                                        <span className={`text-xs font-bold ${isPromo ? 'text-red-400' : 'text-slate-400'}`}>TWD</span>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Invitation Code Section */}
                {onRedeemCode && (
                    <div className="p-6 pt-0 border-t border-slate-100 mt-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">或是輸入邀請碼</label>
                            <div className="flex flex-col md:flex-row gap-2">
                                <input
                                    type="text"
                                    value={invitationCode}
                                    onChange={(e) => setInvitationCode(e.target.value)}
                                    placeholder="輸入邀請碼啟用 PRO"
                                    className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:border-indigo-500 transition-colors w-full md:w-auto"
                                    disabled={isLoading || isRedeeming}
                                />
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={async () => {
                                            if (!invitationCode.trim()) return;
                                            setIsRedeeming(true);
                                            await onRedeemCode(invitationCode);
                                            setIsRedeeming(false);
                                            setInvitationCode('');
                                        }}
                                        disabled={!invitationCode.trim() || isLoading || isRedeeming}
                                        className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-1 md:flex-none whitespace-nowrap"
                                    >
                                        {isRedeeming ? '驗證中...' : '兌換'}
                                    </button>
                                    <a
                                        href="https://line.me/ti/g2/wDCu4uFvyX4nQ3-B-XQ9oN0Rz20aW8X9X9X9X9" // Example Placeholder
                                        target="_blank"
                                        rel="noreferrer"
                                        className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center flex-1 md:flex-none whitespace-nowrap"
                                        title="加入社群獲取邀請碼"
                                    >
                                        獲取
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
