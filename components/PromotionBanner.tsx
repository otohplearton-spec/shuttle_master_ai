import React, { useState, useEffect } from 'react';
import { Promotion } from '../types';

interface PromotionBannerProps {
    activePromotion: Promotion | null;
    onOpenPricing: () => void;
}

const PromotionBanner: React.FC<PromotionBannerProps> = ({ activePromotion, onOpenPricing }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // 1. Logic Check: Must have active promotion
        if (!activePromotion) {
            setIsVisible(false);
            return;
        }

        // 2. Logic Check: Check "Close for Today"
        /*
        if (typeof window !== 'undefined') {
            const closedDate = localStorage.getItem('shuttle_promo_closed_date');
            const today = new Date().toLocaleDateString('zh-TW');
            if (closedDate === today) {
                setIsVisible(false);
                return;
            }
        }
        */

        setIsVisible(true);
    }, [activePromotion]);

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVisible(false);
        const today = new Date().toLocaleDateString('zh-TW');
        localStorage.setItem('shuttle_promo_closed_date', today);
    };

    const getRemainingDays = (endDateStr?: string) => {
        if (!endDateStr) return null;
        try {
            // Replace '/' with '-' is typically robust, but unexpected formats like "YYYY/MM/DD" work in new Date() usually.
            // However, if manual date string is weird, try/catch usage is good.
            const end = new Date(endDateStr);
            const now = new Date();

            // Reset hours to compare effectively
            end.setHours(23, 59, 59, 999);
            now.setHours(0, 0, 0, 0);

            const diffTime = end.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 ? diffDays : 0;
        } catch (e) { return null; }
    };

    if (!isVisible || !activePromotion) return null;

    return (
        <div
            onClick={onOpenPricing}
            className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white px-4 py-3 shadow-md relative z-50 flex items-center justify-center cursor-pointer hover:brightness-110 transition-all shrink-0 w-full"
        >
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                <div className="flex items-center gap-2 font-bold tracking-wide text-xs md:text-sm">
                    <span className="text-lg">👑</span>
                    <span className="font-black text-amber-300 tracking-wider text-base">{activePromotion.label}</span>
                    {getRemainingDays(activePromotion.endDate) !== null && (
                        <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm animate-pulse">
                            最後 {getRemainingDays(activePromotion.endDate)} 天
                        </span>
                    )}
                </div>

                {activePromotion.startDate && (
                    <div className="text-[11px] font-medium text-indigo-200 hidden md:block bg-indigo-950/30 px-2 py-0.5 rounded">
                        {activePromotion.startDate} ~ {activePromotion.endDate}
                    </div>
                )}
            </div>

            {/* Close Button */}
            <button
                onClick={handleClose}
                className="absolute right-2 md:right-4 p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

export default PromotionBanner;
