
export const getAvatarLevelClasses = (level: number) => {
    if (level >= 13) {
        // Master: Rose/Gold with glowing ring
        return "ring-4 ring-rose-400 shadow-lg shadow-rose-200 scale-110 border-2 border-white z-10";
    }
    if (level >= 10) {
        // Expert: Amber/Gold ring
        return "ring-4 ring-amber-300 shadow-md shadow-amber-100 scale-105 border-2 border-white z-10";
    }
    if (level >= 8) {
        // Advanced: Indigo ring
        return "ring-2 ring-indigo-300 shadow-sm border-2 border-white";
    }
    if (level >= 5) {
        // Intermediate: Cyan/Blue subtle ring
        return "ring-2 ring-sky-200 border-2 border-white";
    }
    // Novice: Standard
    return "border border-slate-100";
};

export const getLevelLabelClasses = (level: number) => {
    if (level >= 13) return "text-rose-600 bg-rose-50 border-rose-200";
    if (level >= 10) return "text-amber-600 bg-amber-50 border-amber-200";
    if (level >= 8) return "text-indigo-600 bg-indigo-50 border-indigo-200";
    return "text-slate-500 bg-slate-50 border-slate-200";
};
