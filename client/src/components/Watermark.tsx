import React from 'react';

interface WatermarkProps {
  children: React.ReactNode;
  className?: string;
}

const Watermark = ({ children, className = '' }: WatermarkProps) => (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none z-0 animate-watermark ${className}`}>
    {children}
  </div>
);

export const RegistrationWatermark = () => (
  <Watermark>
    <div className="absolute top-[15%] left-[8%] rotate-[-8deg]">
      <svg width="180" height="160" viewBox="0 0 180 160" fill="none" className="watermark-strong">
        <rect x="20" y="40" width="140" height="100" rx="8" stroke="currentColor" strokeWidth="1" fill="none" />
        <rect x="50" y="10" width="80" height="40" rx="4" stroke="currentColor" strokeWidth="0.8" fill="none" />
        <line x1="40" y1="70" x2="140" y2="70" stroke="currentColor" strokeWidth="0.5" />
        <line x1="40" y1="90" x2="120" y2="90" stroke="currentColor" strokeWidth="0.5" />
        <line x1="40" y1="110" x2="100" y2="110" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="90" cy="28" r="10" stroke="currentColor" strokeWidth="0.8" fill="none" />
      </svg>
    </div>
    <p className="absolute bottom-[20%] right-[5%] text-[11px] font-light tracking-[0.3em] rotate-[5deg] watermark-strong opacity-60">
      LISTING ONLY
    </p>
    <p className="absolute bottom-[15%] right-[8%] text-[9px] font-light tracking-[0.2em] rotate-[5deg] watermark opacity-40">
      AWAITING APPROVAL
    </p>
  </Watermark>
);

export const CommodityWatermark = () => (
  <Watermark>
    <div className="absolute top-[12%] right-[5%] rotate-[6deg]">
      <svg width="160" height="140" viewBox="0 0 160 140" fill="none" className="watermark-strong">
        <line x1="80" y1="20" x2="80" y2="80" stroke="currentColor" strokeWidth="0.8" />
        <line x1="40" y1="50" x2="120" y2="50" stroke="currentColor" strokeWidth="0.8" />
        <path d="M40 50 L30 80 L50 80 Z" stroke="currentColor" strokeWidth="0.6" fill="none" />
        <path d="M120 50 L110 80 L130 80 Z" stroke="currentColor" strokeWidth="0.6" fill="none" />
        <rect x="65" y="80" width="30" height="8" rx="2" stroke="currentColor" strokeWidth="0.6" fill="none" />
      </svg>
    </div>
    <p className="absolute top-[55%] left-[3%] text-[10px] font-mono rotate-[-12deg] watermark opacity-50 leading-relaxed">
      Price = (W ÷ Unit) × Rate
    </p>
    <div className="absolute bottom-[25%] left-[10%] flex gap-3 rotate-[-4deg]">
      {['90kg', '50kg', '100kg'].map((w) => (
        <span key={w} className="text-[9px] font-mono px-2 py-0.5 rounded border watermark-strong opacity-40" style={{ borderColor: 'currentColor' }}>
          {w}
        </span>
      ))}
    </div>
  </Watermark>
);

export const BillingWatermark = () => (
  <Watermark>
    <div className="absolute top-[18%] left-[6%] rotate-[-6deg]">
      <svg width="150" height="180" viewBox="0 0 150 180" fill="none" className="watermark-strong">
        <rect x="15" y="10" width="120" height="160" rx="6" stroke="currentColor" strokeWidth="0.8" fill="none" />
        <line x1="35" y1="40" x2="115" y2="40" stroke="currentColor" strokeWidth="0.4" />
        <line x1="35" y1="60" x2="100" y2="60" stroke="currentColor" strokeWidth="0.4" />
        <line x1="35" y1="80" x2="110" y2="80" stroke="currentColor" strokeWidth="0.4" />
        <line x1="35" y1="100" x2="80" y2="100" stroke="currentColor" strokeWidth="0.4" />
        <line x1="35" y1="130" x2="115" y2="130" stroke="currentColor" strokeWidth="0.6" />
        <text x="75" y="25" textAnchor="middle" fontSize="8" fill="currentColor" className="font-mono">INVOICE</text>
      </svg>
    </div>
    <p className="absolute bottom-[22%] right-[8%] text-[12px] font-mono rotate-[4deg] watermark opacity-40">
      PK 123456
    </p>
    <div className="absolute top-[45%] right-[10%] rotate-[8deg] flex gap-2">
      <span className="text-[18px] watermark opacity-30">%</span>
      <span className="text-[18px] watermark opacity-25">₹</span>
    </div>
  </Watermark>
);

export const AuctionWatermark = () => (
  <Watermark>
    <div className="absolute top-[20%] right-[8%] rotate-[5deg]">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="watermark-strong">
        <rect x="35" y="20" width="50" height="18" rx="4" stroke="currentColor" strokeWidth="0.8" fill="none" transform="rotate(-30 60 29)" />
        <line x1="60" y1="40" x2="60" y2="90" stroke="currentColor" strokeWidth="0.8" />
        <rect x="40" y="88" width="40" height="10" rx="3" stroke="currentColor" strokeWidth="0.6" fill="none" />
      </svg>
    </div>
    <p className="absolute bottom-[30%] left-[8%] text-[10px] font-light tracking-[0.25em] rotate-[-5deg] watermark opacity-40">
      PENDING APPROVAL
    </p>
  </Watermark>
);

export default Watermark;
