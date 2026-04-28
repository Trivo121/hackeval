import React from 'react';

const Logo = ({ className = "w-8 h-8" }) => (
    <div className={`flex items-center justify-center bg-gradient-to-b from-white/15 to-white/5 border border-white/10 rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.05)] ${className}`}>
        <svg 
            viewBox="0 0 24 24" 
            className="w-[60%] h-[60%] text-white drop-shadow-md"
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Left Pillar */}
            <path d="M6 4V20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Right Pillar */}
            <path d="M18 4V20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Middle connecting line */}
            <path d="M6 12H18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Center AI spark */}
            <path d="M12 7.5L13 11L16.5 12L13 13L12 16.5L11 13L7.5 12L11 11L12 7.5Z" fill="currentColor" className="animate-pulse" />
        </svg>
    </div>
);

export default Logo;
