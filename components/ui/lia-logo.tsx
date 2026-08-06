import React from 'react'

interface LiaLogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: 'full' | 'shield' | 'wordmark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showBadge?: boolean
  badgeText?: string
}

const sizeMap = {
  sm: { icon: 24, text: 'text-sm', spacing: 'gap-2' },
  md: { icon: 32, text: 'text-lg', spacing: 'gap-2.5' },
  lg: { icon: 44, text: 'text-2xl', spacing: 'gap-3' },
  xl: { icon: 60, text: 'text-3xl', spacing: 'gap-4' },
}

export function LiaLogo({
  variant = 'full',
  size = 'md',
  showBadge = false,
  badgeText = 'OS',
  className = '',
  ...props
}: LiaLogoProps) {
  const currentSize = sizeMap[size] || sizeMap.md

  const ShieldIcon = (
    <svg
      width={currentSize.icon}
      height={currentSize.icon}
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200 hover:scale-105"
      {...props}
    >
      {/* Container / Shield Background */}
      <rect width="180" height="180" rx="37" fill="var(--color-gunmetal-900, #1C262C)" />
      <rect
        x="1.5"
        y="1.5"
        width="177"
        height="177"
        rx="35.5"
        stroke="var(--color-graphite-700, #3D474D)"
        strokeWidth="3"
        strokeOpacity="0.5"
      />
      <g style={{ transform: 'scale(92%)', transformOrigin: 'center' }}>
        {/* Geometric Accent Lines (Mist) */}
        <path
          fill="var(--color-mist-100, #F2F4F3)"
          fillOpacity="0.9"
          d="M101.141 53H136.632C151.023 53 162.689 64.6662 162.689 79.0573V112.904H148.112V79.0573C148.112 78.7105 148.098 78.3662 148.072 78.0251L112.581 112.898C112.701 112.902 112.821 112.904 112.941 112.904H148.112V126.672H112.941C98.5504 126.672 86.5638 114.891 86.5638 100.5V66.7434H101.141V100.5C101.141 101.15 101.191 101.792 101.289 102.422L137.56 66.7816C137.255 66.7563 136.945 66.7434 136.632 66.7434H101.141V53Z"
        />
        {/* Primary Shield Element (Sober Teal) */}
        <path
          fill="var(--color-teal-500, #2A6A71)"
          d="M65.2926 124.136L14 66.7372H34.6355L64.7495 100.436V66.7372H80.1365V118.47C80.1365 126.278 70.4953 129.958 65.2926 124.136Z"
        />
      </g>
    </svg>
  )

  if (variant === 'shield') {
    return ShieldIcon
  }

  const Wordmark = (
    <div className="flex items-center gap-1.5 select-none font-heading font-bold tracking-tight">
      <span className="text-foreground tracking-[-0.02em]">Lia</span>
      {showBadge && (
        <span className="rounded bg-teal/15 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-teal-signal uppercase border border-teal-signal/20">
          {badgeText}
        </span>
      )}
    </div>
  )

  if (variant === 'wordmark') {
    return Wordmark
  }

  return (
    <div className={`inline-flex items-center ${currentSize.spacing} ${className}`}>
      {ShieldIcon}
      <div className={`flex items-center gap-2 ${currentSize.text}`}>
        <span className="font-heading font-semibold tracking-[-0.02em] text-foreground">
          Lia
        </span>
        {showBadge && (
          <span className="rounded-md bg-teal/20 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-teal-signal uppercase border border-teal-signal/30">
            {badgeText}
          </span>
        )}
      </div>
    </div>
  )
}
