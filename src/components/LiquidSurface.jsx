import { GLASS_FILTER_ID } from './GlassDefs.jsx';

export default function LiquidSurface({
  children,
  className = '',
  cornerRadius = 24,
  tintOpacity = 0.14,
  surfaceRef,
  id,
  role,
  ariaLabel,
  ariaHidden,
}) {
  const setHost = (node) => {
    if (surfaceRef) surfaceRef.current = node;
  };

  return (
    <div
      ref={setHost}
      id={id}
      className={`liquid-surface ${className}`}
      style={{ '--lg-radius': `${cornerRadius}px`, '--lg-tint': tintOpacity }}
      role={role}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    >
      <span
        className="liquid-surface__refract"
        aria-hidden="true"
        style={{ filter: `url(#${GLASS_FILTER_ID})` }}
      />
      <span className="liquid-surface__glare" aria-hidden="true" />
      <div className="liquid-surface__content">{children}</div>
    </div>
  );
}
