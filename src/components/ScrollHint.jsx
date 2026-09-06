import { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

import './ScrollHint.css';

const ScrollHint = () => {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let raf = 0;

    const update = () => {
      raf = 0;
      const threshold = Math.max(160, window.innerHeight * 0.6);
      const progress = Math.min(1, Math.max(0, window.scrollY / threshold));
      root.style.setProperty('--progress', progress.toFixed(3));
    };

    const onFrame = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onFrame, { passive: true });
    window.addEventListener('resize', onFrame, { passive: true });

    return () => {
      window.removeEventListener('scroll', onFrame);
      window.removeEventListener('resize', onFrame);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <span className="scroll-hint" ref={rootRef} aria-hidden="true">
      <span className="scroll-hint__track">
        <span className="scroll-hint__thumb" />
      </span>
      <span className="scroll-hint__chevron">
        <ChevronDown size={20} strokeWidth={2} aria-hidden="true" />
      </span>
    </span>
  );
};

export default ScrollHint;
