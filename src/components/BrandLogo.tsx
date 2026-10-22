import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark';
}

/**
 * Renders the exact Dazzlinglooks.in logo preserving:
 * - Orange (#FF6B00) and deep-purple (#3B0764) wordmark
 * - Gold (#D4AF37) decorative divider and 8-point center star
 * - "Beauty Begins Here" tagline
 * - Original proportions, typography, and artwork without stretching or cropping.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  theme = 'light',
}) => {
  const dimensions = {
    sm: 'h-10 w-auto',
    md: 'h-12 w-auto',
    lg: 'h-16 w-auto',
  }[size];

  return (
    <div className={`inline-flex items-center select-none shrink-0 ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 380 92"
        fill="none"
        role="img"
        aria-label="Dazzlinglooks.in — Beauty Begins Here"
        className={`${dimensions} object-contain`}
      >
        <defs>
          <linearGradient id="dlGoldGradComp" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C59B27" stopOpacity="0.15" />
            <stop offset="35%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#F3E5AB" />
            <stop offset="65%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#C59B27" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="dlStarGradComp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F3E5AB" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#9A7B1C" />
          </linearGradient>
          {theme === 'dark' && (
            <filter id="purpleGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.6" floodColor="#F3E5AB" floodOpacity="0.85" />
            </filter>
          )}
        </defs>

        {/* Wordmark: Dazzling (Orange) + looks.in (Deep Purple) */}
        <text
          x="190"
          y="38"
          textAnchor="middle"
          fontFamily="'Cormorant Garamond', Georgia, serif"
          fontSize="35"
          fontWeight="700"
          letterSpacing="0.5"
        >
          <tspan fill="#FF6B00">Dazzling</tspan>
          <tspan
            fill="#3B0764"
            stroke={theme === 'dark' ? '#F3E5AB' : 'none'}
            strokeWidth={theme === 'dark' ? '0.6' : '0'}
          >
            looks
          </tspan>
          <tspan fill="#FF6B00" fontSize="26" fontWeight="600">
            .in
          </tspan>
        </text>

        {/* Gold Decorative Divider & Center Star */}
        <path
          d="M36 53 H172"
          stroke="url(#dlGoldGradComp)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M208 53 H344"
          stroke="url(#dlGoldGradComp)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <polygon points="175,53 179,50 183,53 179,56" fill="#D4AF37" />
        <polygon points="197,53 201,50 205,53 201,56" fill="#D4AF37" />
        <path
          d="M190 42 L192.6 49.8 L200.5 52.5 L192.6 55.2 L190 63 L187.4 55.2 L179.5 52.5 L187.4 49.8 Z"
          fill="url(#dlStarGradComp)"
        />
        <circle cx="190" cy="52.5" r="1.6" fill="#FFFFFF" />

        {/* Tagline: Beauty Begins Here */}
        <text
          x="190"
          y="79"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontSize="10.5"
          fontWeight="600"
          letterSpacing="4.5"
          fill={theme === 'dark' ? '#F3E5AB' : '#3B0764'}
        >
          BEAUTY BEGINS HERE
        </text>
      </svg>
    </div>
  );
};
