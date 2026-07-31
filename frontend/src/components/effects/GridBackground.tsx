import React from 'react';

const GridBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(129,140,248,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(129,140,248,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Scan line effect */}
      <div className="absolute inset-0 animate-scan-line opacity-[0.03]">
        <div
          className="w-full h-[2px]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.6), transparent)',
          }}
        />
      </div>

      {/* Corner accent glow */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[120px] opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4), transparent)' }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-[120px] opacity-10"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3), transparent)' }}
      />
    </div>
  );
};

export default GridBackground;
