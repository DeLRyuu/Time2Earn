import React from 'react';

export type ArcadeIconName =
  | 'home'
  | 'joy'
  | 'joystick'
  | 'gift'
  | 'cup'
  | 'trophy'
  | 'coin'
  | 'bolt'
  | 'lock'
  | 'fire'
  | 'flame'
  | 'crown'
  | 'pad'
  | 'gamepad'
  | 'clock'
  | 'cart'
  | 'user'
  | 'settings'
  | 'logout'
  | 'shield'
  | 'check'
  | 'x';

interface ArcadeIconProps extends React.SVGProps<SVGSVGElement> {
  name: ArcadeIconName;
  className?: string;
  size?: number | string;
}

export const ArcadeIcon: React.FC<ArcadeIconProps> = ({
  name,
  className = '',
  size,
  style,
  ...props
}) => {
  const iconStyle: React.CSSProperties = {
    ...(size ? { width: size, height: size } : {}),
    ...style,
  };

  const renderPath = () => {
    switch (name) {
      case 'home':
        return <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />;
      case 'joy':
      case 'joystick':
        return (
          <>
            <circle cx="12" cy="6" r="3" />
            <path d="M12 9v6M5 21h14v-3a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3z" />
          </>
        );
      case 'gift':
        return (
          <>
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M5 12v9h14v-9M12 8v13M12 8c-2-4-6-3-5 0 .5 1.5 5 0 5 0zm0 0c2-4 6-3 5 0-.5 1.5-5 0-5 0z" />
          </>
        );
      case 'cup':
      case 'trophy':
        return (
          <>
            <path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 21h8M9 18h6" />
          </>
        );
      case 'coin':
        return (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
          </>
        );
      case 'bolt':
        return <path d="M13 2L4 14h7l-1 8 9-12h-7z" />;
      case 'lock':
        return (
          <>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </>
        );
      case 'fire':
      case 'flame':
        return <path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z" />;
      case 'crown':
        return <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" />;
      case 'pad':
      case 'gamepad':
        return (
          <>
            <rect x="2" y="7" width="20" height="11" rx="5" />
            <path d="M7 10v5M4.5 12.5h5M16 11h.01M18 14h.01" />
          </>
        );
      case 'clock':
        return (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </>
        );
      case 'cart':
        return <path d="M3 4h3l2 11h10l2-8H7M9 20h.01M17 20h.01" />;
      case 'user':
        return (
          <>
            <circle cx="12" cy="7" r="4" />
            <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
          </>
        );
      case 'settings':
        return (
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </>
        );
      case 'logout':
        return <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />;
      case 'shield':
        return <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
      case 'check':
        return <polyline points="20 6 9 17 4 12" />;
      case 'x':
        return (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className={`i ${className}`.trim()}
      style={iconStyle}
      aria-hidden="true"
      {...props}
    >
      {renderPath()}
    </svg>
  );
};
