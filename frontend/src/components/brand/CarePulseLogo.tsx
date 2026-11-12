import React from 'react';

interface CarePulseLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
  variant?: 'full' | 'icon-only';
}

export function CarePulseLogo({
  size = 'md',
  showText = true,
  showTagline = true,
  className = '',
  onClick,
  variant,
}: CarePulseLogoProps) {
  // If explicitly full logo or both text and tagline requested, use the exact cropped full logo image
  const isFullLogo = variant === 'full' || (showText && showTagline);

  // Height mappings for exact aspect ratio preservation
  const fullLogoHeights = {
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-11',
    lg: 'h-14 sm:h-16',
    xl: 'h-20 sm:h-24',
  };

  const iconHeights = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-4xl sm:text-5xl',
  };

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px] sm:text-xs',
    lg: 'text-xs sm:text-sm',
    xl: 'text-sm sm:text-base',
  };

  if (isFullLogo) {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center select-none ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <img
          src="/carepulse-logo-trimmed.png"
          alt="CarePulse — Always Watching. Always Caring."
          className={`${fullLogoHeights[size]} w-auto object-contain shrink-0`}
          loading="eager"
        />
      </div>
    );
  }

  // Header compact variant: Circular Stethoscope Icon + Typography
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center space-x-2.5 select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <img
        src="/carepulse-icon-trimmed.png"
        alt="CarePulse"
        className={`${iconHeights[size]} object-contain shrink-0 drop-shadow-xs`}
        loading="eager"
      />
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <span
            className={`font-black tracking-tight text-[#131E3A] ${titleSizes[size]}`}
            style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
          >
            CarePulse
          </span>
          {showTagline && (
            <span
              className={`font-bold tracking-tight text-[#00A896] mt-0.5 ${taglineSizes[size]}`}
            >
              Always Watching. Always Caring.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
