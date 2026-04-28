import React from 'react';

const Logo = ({ className = "w-8 h-8" }) => (
    <div className={`flex items-center justify-center bg-white/10 border border-white/10 rounded-lg backdrop-blur-sm ${className}`}>
        <svg 
            viewBox="0 0 24 24" 
            className="w-[60%] h-[60%] text-white"
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Left Bracket - representing Hackathons/Code */}
            <path 
                d="M9 8L5 12L9 16" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
            
            {/* Checkmark - representing Evaluation/Scoring */}
            <path 
                d="M10 13L13 16L19 8" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
        </svg>
    </div>
);

export default Logo;
