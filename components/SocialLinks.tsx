import React from 'react';

interface SocialLinksProps {
    className?: string;
    itemClassName?: string;
    isMobile?: boolean;
    mode?: 'light' | 'dark';
    variant?: 'default' | 'outline';
    gridCols?: number;
}

const SocialLinks: React.FC<SocialLinksProps> = ({ className = "", itemClassName = "", isMobile = false, variant = 'default', mode = 'light', gridCols }) => {
    // Replace these URLs with actual links
    const LINKS = {
        report: "https://forms.gle/CHANGE_ME_TO_YOUR_FORM", // Google Form or similar
        facebook: "https://facebook.com/CHANGE_ME",
        line: "https://line.me/ti/p/CHANGE_ME",
        instagram: "https://instagram.com/CHANGE_ME"
    };

    const items = [
        {
            key: 'report',
            label: '問題回報',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
            ),
            url: LINKS.report,
            color: 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-100'
        },
        {
            key: 'facebook',
            label: 'Facebook',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
            ),
            url: LINKS.facebook,
            color: 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border-blue-100'
        },
        {
            key: 'line',
            label: 'LINE 好友',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.288 13.43c-1.46-7.85-15.01-6.19-15.01-6.19S3.52 7 3.52 11.95s2.21 8.89 10.5 8.89c2.09 0 4.07-.35 5.51-.59.72-.11 1.48.51 1.25 1.55-.26 1.16-.76 2.55-.76 2.55s3.59-2.38 4.79-4.14c.78-1.12.91-2.09 1.13-2.97.42-1.63 1.05-3.01.62-4.22-.36-1.02-1.39-4.83-4.27-2.6-1.55 1.21 2.38 1.41 1.28 5.75-.41 1.63-1.63 2.6-1.63 2.6s-.31-.53-.41-1.09c-.11-.64.08-1.19.08-1.19s-.42.27-.85.39c-1.12.33-2.31.2-3.09.11-2.9-.34-4.21-1.78-4.21-1.78s1.61-2.58 6.51-2.76c2.4-.09 3.56.84 3.56.84s1.29-2.05-3.35-2.05c-5.91-.76-7.39 3.99-7.39 3.99s-1.88 5.43 5.45 6.91c2.25.45 4.39.06 4.39.06s.96 1.05-1.99 1.66c-2.08.43-5.26-.68-1.19-2.05-1.34-3.04-3.71-3.04-3.71s3.71 1.09 7.03-.66c1.69-.89 2.54-2.5 2.54-2.5s.49 1.43-1.03 2.47c-1.52 1.04-3.56.97-3.56.97s-2.05-.28-3.14-1.33c-.76-.73-1.19-1.99-1.19-1.99s-.13-2.51 2.51-3.95c3.08-1.67 7.03-.61 7.03-.61s5.27 2.12 3.61 9.42z" />
                </svg>
            ),
            url: LINKS.line,
            color: 'bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 border-green-100'
        },
        {
            key: 'instagram',
            label: 'Instagram',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.76-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
            ),
            url: LINKS.instagram,
            color: 'bg-pink-50 text-pink-600 hover:bg-pink-100 hover:text-pink-700 border-pink-100'
        }
    ];

    const getVariantClasses = (itemColor: string) => {
        if (variant === 'outline') {
            if (mode === 'dark') {
                return 'bg-transparent border-2 border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10';
            } else {
                // Light mode outline
                return 'bg-white border-2 border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50';
            }
        }
        return itemColor;
    };

    const gridClass = gridCols ? `grid-cols-${gridCols}` : (isMobile ? 'grid-cols-2' : 'grid-cols-4');

    return (
        <div className={`grid ${gridClass} gap-2 ${className}`}>
            {items.map(item => (
                <a
                    key={item.key}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`
            flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all duration-200 shadow-sm active:scale-95
            ${getVariantClasses(item.color)} ${itemClassName}
            ${isMobile ? 'aspect-[2/1]' : 'aspect-square lg:aspect-auto lg:h-auto lg:py-2'} 
          `}
                >
                    {item.icon}
                    <span className="text-[10px] font-black">{item.label}</span>
                </a>
            ))}
        </div>
    );
};

export default SocialLinks;
