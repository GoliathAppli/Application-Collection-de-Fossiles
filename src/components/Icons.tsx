import React from 'react';

export const TrilobiteIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M32 4 A20 28 0 0 0 12 32 A20 28 0 0 0 32 60 A20 28 0 0 0 52 32 A20 28 0 0 0 32 4 Z" />
    <path d="M24 4 V60 M40 4 V60 M14 20 H50 M12 32 H52 M14 44 H50" />
    <path d="M18 12 Q32 18 46 12" />
    <path d="M18 52 Q32 46 46 52" />
  </svg>
);

export const AmmoniteIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M32 4 C16.5 4 4 16.5 4 32 C4 47.5 16.5 60 32 60 C47.5 60 60 47.5 60 32 C60 21 51 12 40 12 C29 12 20 21 20 32 C20 38.6 25.4 44 32 44 C38.6 44 44 38.6 44 32 C44 28.7 41.3 26 38 26 C34.7 26 32 28.7 32 32 C32 33.7 33.3 35 35 35" />
    <path d="M5 32 Q15 45 32 4 C15 15 5 26 5 32" strokeWidth="1" />
    <path d="M59 32 Q45 20 32 60 C45 45 59 38 59 32" strokeWidth="1" />
    <path d="M32 44 Q25 40 40 12" strokeWidth="1" />
    <path d="M20 32 Q25 25 44 32" strokeWidth="1" />
  </svg>
);

export const MammothIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Body */}
    <path d="M54 36 C54 20 44 14 30 16 C16 18 12 28 12 38 V54 H18 V42 H22 V54 H28 V40 H40 V54 H46 V42 C48 42 54 40 54 36 Z" />
    {/* Tusks */}
    <path d="M14 36 C4 40 4 52 14 56 C20 58 26 56 26 50" />
    {/* Trunk */}
    <path d="M12 38 C12 48 8 58 14 62 C20 64 22 60 20 56 C18 52 16 54 16 58" />
  </svg>
);
