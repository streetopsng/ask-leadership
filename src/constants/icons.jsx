import React from 'react';

export function MicIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function QrIcon({ className = "w-full h-full" }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <rect x="4" y="4" width="26" height="26" fill="none" stroke="#241B33" strokeWidth="6" />
      <rect x="12" y="12" width="10" height="10" fill="#241B33" />
      <rect x="70" y="4" width="26" height="26" fill="none" stroke="#241B33" strokeWidth="6" />
      <rect x="78" y="12" width="10" height="10" fill="#241B33" />
      <rect x="4" y="70" width="26" height="26" fill="none" stroke="#241B33" strokeWidth="6" />
      <rect x="12" y="78" width="10" height="10" fill="#241B33" />
      <rect x="40" y="4" width="8" height="8" fill="#241B33" />
      <rect x="52" y="4" width="8" height="16" fill="#241B33" />
      <rect x="40" y="20" width="8" height="8" fill="#241B33" />
      <rect x="40" y="40" width="8" height="8" fill="#241B33" />
      <rect x="52" y="40" width="8" height="8" fill="#241B33" />
      <rect x="64" y="40" width="8" height="8" fill="#241B33" />
      <rect x="40" y="52" width="16" height="8" fill="#241B33" />
      <rect x="64" y="52" width="8" height="16" fill="#241B33" />
      <rect x="80" y="40" width="8" height="24" fill="#241B33" />
      <rect x="40" y="64" width="8" height="8" fill="#241B33" />
      <rect x="52" y="70" width="8" height="24" fill="#241B33" />
      <rect x="70" y="70" width="8" height="8" fill="#241B33" />
      <rect x="86" y="70" width="8" height="24" fill="#241B33" />
      <rect x="40" y="82" width="8" height="12" fill="#241B33" />
    </svg>
  );
}

export function SparkleIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function ChatIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 5h16v11H9l-5 4V5Z" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function HeartIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20s-7-4.5-9.3-9C1.2 7.8 3 4.5 6.5 4.5c2 0 3.3 1 5.5 3 2.2-2 3.5-3 5.5-3C21 4.5 22.8 7.8 21.3 11c-2.3 4.5-9.3 9-9.3 9Z" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function PeopleIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="3" strokeWidth="1.8" />
      <circle cx="17" cy="9" r="2.4" strokeWidth="1.8" />
      <path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14.5 14.5c2.4.2 4 1.9 4 4.5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function DiceIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="4" strokeWidth="1.8" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" />
      <circle cx="16" cy="8" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="8" cy="16" r="1.3" fill="currentColor" />
      <circle cx="16" cy="16" r="1.3" fill="currentColor" />
    </svg>
  );
}
