import React from 'react';

/**
 * HackEval Logo Component
 * A minimalist, geometric brand mark.
 * @param {number} size - The width/height of the logo
 * @param {string} color - The primary color of the icon
 * @param {string} className - Additional CSS classes
 */
const Logo = ({ size = 32, color = "currentColor", className = "" }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* The Outer Frame: Modern rounded square */}
            <rect
                x="10"
                y="10"
                width="80"
                height="80"
                rx="22"
                fill={color}
                fillOpacity="0.05"
                stroke={color}
                strokeWidth="1.5"
            />

            {/* The Core Mark: A fusion of a code bracket and a checkmark */}
            <path
                d="M35 30 L25 50 L35 70 M45 60 L55 75 L80 35"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* The Pulse Point: Representing the AI Audit node */}
            <circle
                cx="80"
                cy="35"
                r="5"
                fill="white"
                className="animate-pulse"
            />
        </svg>
    );
};

export default Logo;