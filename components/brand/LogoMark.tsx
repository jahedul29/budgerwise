import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

type LogoMarkProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function LogoMark({ className, title, ...props }: LogoMarkProps) {
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
      <path
        d="M18 44V39"
        stroke="white"
        strokeOpacity="0.28"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M25 44V34"
        stroke="white"
        strokeOpacity="0.28"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M32 44V37"
        stroke="white"
        strokeOpacity="0.28"
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
