import React from 'react';

interface OrionLogoIconProps {
  size?: number;
}

export const OrionLogoIcon: React.FC<OrionLogoIconProps> = ({ size = 48 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0px 0px 10px rgba(0, 212, 255, 0.5))' }}
    >
      <defs>
        <filter id="iconGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Hexágono */}
      <path
        d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z"
        fill="#0A1628"
        stroke="#00D4FF"
        strokeWidth="2"
        filter="url(#iconGlow)"
      />

      {/* Red neural simplificada */}
      <g filter="url(#iconGlow)">
        <circle cx="50" cy="35" r="2" fill="#00D4FF" />
        <circle cx="65" cy="45" r="2" fill="#00D4FF" />
        <circle cx="65" cy="60" r="2" fill="#00D4FF" />
        <circle cx="50" cy="70" r="2" fill="#00D4FF" />
        <circle cx="35" cy="60" r="2" fill="#00D4FF" />
        <circle cx="35" cy="45" r="2" fill="#00D4FF" />
        
        <path
          d="M50 35 L65 45 L65 60 L50 70 L35 60 L35 45 Z"
          stroke="#00D4FF"
          strokeWidth="1.5"
          opacity="0.8"
        />
        
        <circle cx="50" cy="52" r="3" fill="#00D4FF" />
      </g>

      {/* Estrellas en vértices */}
      {[
        [50, 10], [85, 30], [85, 70], [50, 90], [15, 70], [15, 30]
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="2"
          fill="#00D4FF"
          filter="url(#iconGlow)"
        />
      ))}
    </svg>
  );
};
