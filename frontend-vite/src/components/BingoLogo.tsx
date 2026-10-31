import { useEffect, useRef, useState } from 'react';

export type BingoLogoProps = {
  size?: number | string;
  interactive?: boolean;
};

const P = {
  bg: '#EADDBA',
  surface: '#FFFFFF',
  primary: '#B9895F',
  support: '#776938',
  card: '#FDF6EE',
};

export function BingoLogo({ size = 120, interactive = false }: BingoLogoProps) {
  const [lifted, setLifted] = useState(false);
  const [happy, setHappy] = useState(false);

  const happyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (happyTimer.current !== null) clearTimeout(happyTimer.current);
  }, []);

  const handleClick = () => {
    if (!interactive) return;
    if (happyTimer.current !== null) clearTimeout(happyTimer.current);
    setHappy(true);
    happyTimer.current = setTimeout(() => {
      setHappy(false);
      happyTimer.current = null;
    }, 900);
  };

  return (
    <svg
      className="outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B9895F] rounded-2xl"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={interactive ? 'button' : 'img'}
      aria-label={interactive ? 'Ubah ekspresi EduBot' : 'Logo EduBot'}
      aria-pressed={interactive ? happy : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (interactive && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          handleClick();
        }
      }}
      onMouseEnter={() => interactive && setLifted(true)}
      onMouseLeave={() => setLifted(false)}
      onFocus={() => interactive && setLifted(true)}
      onBlur={() => setLifted(false)}
      style={{
        display: 'block',
        overflow: 'visible',
        cursor: interactive ? 'pointer' : 'default',
        transform: lifted ? 'translateY(-6px) scale(1.05)' : 'translateY(0) scale(1)',
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        filter: lifted
          ? `drop-shadow(0 8px 16px ${P.primary}55)`
          : `drop-shadow(0 4px 8px ${P.primary}33)`,
      }}
    >
      {/* orbit */}
      <circle cx="60" cy="60" r="54" stroke={P.primary} strokeWidth="1.5" strokeDasharray="6 4" opacity="0.35" />
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="5s" repeatCount="indefinite" />
        <circle cx="60" cy="6" r="4.5" fill={P.support} opacity="0.7" />
      </g>

      {/* Badan dan layar wajah */}
      <rect x="18" y="32" width="84" height="72" rx="20" fill={P.primary} />
      <rect x="26" y="40" width="68" height="52" rx="14" fill={P.card} />

      {/* Antena */}
      <rect x="56" y="8" width="8" height="26" rx="4" fill={P.support} />
      <circle cx="60" cy="8" r="7" fill={P.support}>
        <animate attributeName="r" values="7;9;7" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.55;1" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="8" r="4" fill={P.bg} />

      {/* Telinga */}
      <rect x="8" y="52" width="12" height="18" rx="6" fill={P.support} />
      <rect x="100" y="52" width="12" height="18" rx="6" fill={P.support} />
      <circle cx="14" cy="61" r="3" fill={P.bg} />
      <circle cx="106" cy="61" r="3" fill={P.bg} />

      {/* Mata dan ekspresi dari SVG Bingo */}
      {[44, 76].map((cx, index) => (
        <g key={cx}>
          <ellipse cx={cx} cy="62" rx="10" ry={happy ? 3 : 10} fill={P.surface}
            style={{ transformOrigin: `${cx}px 62px`, transition: 'ry 0.15s' }}>
            {!happy && (
              <animate attributeName="ry" values="10;10;10;10;1;10;10"
                keyTimes="0;0.7;0.74;0.78;0.82;0.86;1" dur="4s"
                begin={index === 0 ? '0s' : '0.2s'} repeatCount="indefinite" />
            )}
          </ellipse>
          <circle cx={cx + 1} cy="62" r={happy ? 0 : 6} fill={P.support} style={{ transition: 'r 0.15s' }} />
          <circle cx={cx + 3} cy="60" r={happy ? 0 : 2.5} fill={P.surface} style={{ transition: 'r 0.15s' }} />
          {happy && <path d={`M ${cx - 8} 62 Q ${cx} 54 ${cx + 8} 62`} stroke={P.support} strokeWidth="3" strokeLinecap="round" fill="none" />}
        </g>
      ))}

      {/* Mulut dan pipi */}
      <path d={happy ? 'M 42 78 Q 60 90 78 78' : 'M 44 78 Q 60 86 76 78'} stroke={P.support} strokeWidth={happy ? 3.5 : 3} strokeLinecap="round" />
      <ellipse cx="32" cy="72" rx="7" ry="5" fill={P.primary} opacity="0.45" />
      <ellipse cx="88" cy="72" rx="7" ry="5" fill={P.primary} opacity="0.45" />

      {/* Panel dada */}
      <rect x="46" y="86" width="28" height="14" rx="6" fill={P.bg} opacity="0.7" />
      <circle cx="54" cy="93" r="3" fill={P.support}>
        <animate attributeName="opacity" values="1;0.3;1" dur="1.1s" repeatCount="indefinite" />
      </circle>
      <circle cx="66" cy="93" r="3" fill={P.primary}>
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.1s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export default BingoLogo;
