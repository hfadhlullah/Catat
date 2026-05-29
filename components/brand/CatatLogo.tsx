"use client";

import { cn } from "@/lib/utils";

export function CatatLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 150"
      aria-label="Catat"
      role="img"
      className={cn("h-10 w-auto text-foreground", className)}
    >
      <defs>
        <linearGradient id="catat-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="catat-trend-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>

      <g transform="translate(20, 15)">
        <rect x="10" y="10" width="90" height="110" rx="16" fill="url(#catat-icon-grad)" />
        <rect x="5" y="30" width="10" height="6" rx="3" fill="#ffffff" opacity="0.8" />
        <rect x="5" y="55" width="10" height="6" rx="3" fill="#ffffff" opacity="0.8" />
        <rect x="5" y="80" width="10" height="6" rx="3" fill="#ffffff" opacity="0.8" />
        <rect x="5" y="105" width="10" height="6" rx="3" fill="#ffffff" opacity="0.8" />
        <line x1="35" y1="35" x2="85" y2="35" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.4" />
        <line x1="35" y1="55" x2="75" y2="55" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.4" />
        <line x1="35" y1="75" x2="85" y2="75" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.4" />
        <line x1="35" y1="95" x2="65" y2="95" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.4" />
        <path d="M 35,95 L 55,75 L 70,85 L 95,50" fill="none" stroke="url(#catat-trend-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="95" cy="50" r="5" fill="#fbbf24" />
      </g>

      <text
        x="145"
        y="88"
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontWeight="800"
        fontSize="64"
        fill="currentColor"
        letterSpacing="-1px"
      >
        Catat
      </text>
      <text
        x="148"
        y="115"
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontWeight="500"
        fontSize="16"
        fill="color-mix(in oklab, currentColor 55%, transparent)"
        letterSpacing="3px"
      >
        EXPENSE TRACKER
      </text>
    </svg>
  );
}
