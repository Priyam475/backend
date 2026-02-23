import React from 'react';

interface RaindropParticlesProps {
  count?: number;
}

const RaindropParticles = ({ count = 20 }: RaindropParticlesProps) => {
  const drops = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    width: 1 + Math.random() * 2,
    height: 10 + Math.random() * 18,
    duration: 2.5 + Math.random() * 3.5,
    delay: Math.random() * 5,
    opacity: 0.06 + Math.random() * 0.12,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {drops.map((d) => (
        <div
          key={d.id}
          className="absolute animate-raindrop"
          style={{
            left: d.left,
            top: '-5%',
            width: d.width,
            height: d.height,
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            background: `linear-gradient(180deg, rgba(255,255,255,${d.opacity}) 0%, rgba(200,220,255,${d.opacity * 0.5}) 60%, transparent 100%)`,
            boxShadow: `0 0 ${4 + d.width * 2}px rgba(180,200,255,${d.opacity * 0.3})`,
            '--duration': `${d.duration}s`,
            '--delay': `${d.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default RaindropParticles;
