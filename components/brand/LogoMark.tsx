import { useId } from 'react';
import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

type LogoMarkProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function LogoMark({ className, title, ...props }: LogoMarkProps) {
  const gradientId = useId().replace(/:/g, '');
  const shineId = useId().replace(/:/g, '');

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : 'presentation'}
      className={cn('shrink-0', className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#06D6A0" />
          <stop offset="0.55" stopColor="#118AB2" />
          <stop offset="1" stopColor="#073B4C" />
        </linearGradient>
        <radialGradient id={shineId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(21 16) rotate(47.49) scale(35.6545)">
          <stop stopColor="white" stopOpacity="0.32" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#${gradientId})`} />
      <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#${shineId})`} />
      <path
        d="M18 44V39"
        stroke="white"
        strokeOpacity="0.22"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M25 44V34"
        stroke="white"
        strokeOpacity="0.22"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M32 44V37"
        stroke="white"
        strokeOpacity="0.22"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M18 39L27 31L35 36L46 24"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M39 24H46V31"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="39" r="2.5" fill="white" />
      <circle cx="27" cy="31" r="2.5" fill="white" />
      <circle cx="35" cy="36" r="2.5" fill="white" />
    </svg>
  );
}
