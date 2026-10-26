import React from 'react';

const OrionAnimatedLogo: React.FC = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '200px', overflow: 'hidden' }}>
      <style>{`
        @keyframes elegantZoom {
          0% { transform: scale(0.92); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes linePulse {
          0% { stroke-dashoffset: 20; opacity: 0.2; }
          50% { opacity: 0.7; }
          100% { stroke-dashoffset: 0; opacity: 0.2; }
        }
        @keyframes nodeGlow {
          0%, 100% { fill: #00D4FF; filter: drop-shadow(0 0 2px rgba(0, 212, 255, 0.4)); opacity: 0.5; }
          50% { fill: #FFFFFF; filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.9)); opacity: 1; }
        }
        .logo-container {
          animation: elegantZoom 5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          width: 200px;
          height: 200px;
        }
        .connection-line {
          stroke: #00D4FF;
          stroke-width: 1.5;
          stroke-dasharray: 10 10;
          animation: linePulse 3s linear infinite;
          opacity: 0.3;
        }
        .network-node {
          fill: #00D4FF;
          animation: nodeGlow 2.5s ease-in-out infinite;
        }
      `}</style>

      <div className="logo-container">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <g className="connection-line">
            <path d="M100 20 L140 30 L170 60 L180 100 L170 140 L140 170 L100 180 L60 170 L30 140 L20 100 L30 60 L60 30 Z" />
            <path d="M100 50 L135 65 L150 100 L135 135 L100 150 L65 135 L50 100 L65 65 Z" />
            <path d="M100 20 L100 50 M140 30 L135 65 M170 60 L150 100 M180 100 L135 135 M170 140 L100 150 M140 170 L65 135 M100 180 L50 100 M60 170 L65 65 M30 140 L100 50 M20 100 L135 65 M30 60 L150 100 M60 30 L135 135" />
          </g>
          <g>
            {[[100, 20], [140, 30], [170, 60], [180, 100], [170, 140], [140, 170], [100, 180], [60, 170], [30, 140], [20, 100], [30, 60], [60, 30]].map(([cx, cy], i) => (
              <circle key={`outer-${i}`} cx={cx} cy={cy} r="3.5" className="network-node" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
            {[[100, 50], [135, 65], [150, 100], [135, 135], [100, 150], [65, 135], [50, 100], [65, 65]].map(([cx, cy], i) => (
              <circle key={`inner-${i}`} cx={cx} cy={cy} r="4.5" className="network-node" style={{ animationDelay: `${1.8 - (i * 0.15)}s` }} />
            ))}
            <circle cx="100" cy="100" r="6" fill="#00D4FF" className="network-node" style={{ animationDelay: '0s' }} />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default OrionAnimatedLogo;