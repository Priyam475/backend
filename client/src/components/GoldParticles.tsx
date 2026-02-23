import { motion } from 'framer-motion';

interface GoldParticlesProps {
  count?: number;
}

const GoldParticles = ({ count = 12 }: GoldParticlesProps) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 2 + Math.random() * 4,
    duration: 4 + Math.random() * 6,
    delay: Math.random() * 5,
    opacity: 0.2 + Math.random() * 0.4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-particle"
          style={{
            left: p.left,
            bottom: '10%',
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, hsl(222 100% 68% / ${p.opacity}), transparent)`,
            '--duration': `${p.duration}s`,
            '--delay': `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default GoldParticles;
