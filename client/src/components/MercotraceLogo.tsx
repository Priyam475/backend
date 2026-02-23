import { motion } from 'framer-motion';

interface MercotraceLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  animate?: boolean;
  color?: string;
}

const sizes = {
  sm: { icon: 28, text: 'text-lg', gap: 'gap-2' },
  md: { icon: 36, text: 'text-xl', gap: 'gap-2.5' },
  lg: { icon: 48, text: 'text-3xl', gap: 'gap-3' },
  xl: { icon: 64, text: 'text-4xl', gap: 'gap-4' },
};

export const MercotraceIcon = ({ size = 48, color = 'white', className = '' }: { size?: number; color?: string; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M2 88L32 20L58 62L32 62L22 44L12 62L32 62L58 62L42 88H2Z" fill={color} />
    <path d="M50 88L80 20L118 88H50ZM80 42L98 76H68L80 42Z" fill={color} />
  </svg>
);

// Backward compat alias
export const MercodeskIcon = MercotraceIcon;

const MercotraceLogo = ({ size = 'md', showText = true, className = '', animate = false, color = 'white' }: MercotraceLogoProps) => {
  const s = sizes[size];
  const Wrapper = animate ? motion.div : 'div';
  const wrapperProps = animate ? { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } } : {};

  return (
    <Wrapper className={`flex items-center ${s.gap} ${className}`} {...(wrapperProps as any)}>
      <MercotraceIcon size={s.icon} color={color} />
      {showText && <span className={`${s.text} font-extrabold text-white tracking-tight`}>Mercotrace</span>}
    </Wrapper>
  );
};

export default MercotraceLogo;
