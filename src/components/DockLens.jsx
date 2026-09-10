import { useEffect, useLayoutEffect, useRef } from 'react';
import './DockLens.css';

const SPRING_K = 0.14;
const SPRING_C = 0.72;
const DRAG_THRESHOLD = 10;

export default function DockLens({ active, items, reduced }) {
  const lensRef = useRef(null);
  const wakeRef = useRef(() => {});
  const st = useRef({
    x: 0,
    tx: 0,
    scale: 1,
    ts: 1,
    vx: 0,
    vs: 0,
    down: false,
    dragging: false,
    wasDrag: false,
    startX: 0,
    raf: 0,
  });

  const centers = () => {
    const dock = lensRef.current?.parentElement?.closest?.('.mobile-dock') || lensRef.current?.parentElement;
    if (!dock) return [];
    return Array.from(dock.querySelectorAll('.dock-link')).map((el) => ({
      x: el.offsetLeft + el.offsetWidth / 2,
      key: el.getAttribute('data-nav'),
    }));
  };

  const activeCenter = () => {
    const cs = centers();
    const idx = items.findIndex((i) => i.key === active);
    return (cs[idx] || cs[0])?.x ?? 0;
  };

  const nearest = (rel) => {
    const cs = centers();
    let best = null;
    let distance = Infinity;
    for (const c of cs) {
      const d = Math.abs(c.x - rel);
      if (d < distance) {
        distance = d;
        best = c;
      }
    }
    return best;
  };

  const apply = () => {
    const s = st.current;
    const el = lensRef.current;
    if (el) {
      el.style.transform = `translateX(${s.x}px) translate(-50%, -50%) scale(${s.scale})`;
    }
  };

  const snapToActive = () => {
    const s = st.current;
    s.x = s.tx = activeCenter();
    s.scale = s.ts = 1;
    s.vx = s.vs = 0;
    apply();
  };

  useEffect(() => {
    if (reduced) snapToActive();
  }, [active, items, reduced]);

  useEffect(() => {
    if (reduced) {
      snapToActive();
      return undefined;
    }
    const stop = () => {
      if (st.current.raf) cancelAnimationFrame(st.current.raf);
      st.current.raf = 0;
    };
    const loop = () => {
      const s = st.current;
      if (!s.dragging) {
        const ax = (s.tx - s.x) * SPRING_K - s.vx * SPRING_C;
        s.vx += ax;
        s.x += s.vx;
      }
      const as = (s.ts - s.scale) * SPRING_K - s.vs * SPRING_C;
      s.vs += as;
      s.scale += s.vs;
      apply();
      const settled =
        !s.dragging &&
        Math.abs(s.tx - s.x) < 0.05 &&
        Math.abs(s.vx) < 0.05 &&
        Math.abs(s.ts - s.scale) < 0.005 &&
        Math.abs(s.vs) < 0.005;
      if (settled) {
        s.x = s.tx;
        s.scale = s.ts;
        s.vx = s.vs = 0;
        apply();
        s.raf = 0;
        return;
      }
      s.raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (!st.current.raf) st.current.raf = requestAnimationFrame(loop);
    };
    wakeRef.current = wake;
    wake();
    return () => {
      wakeRef.current = () => {};
      stop();
    };
  }, [reduced]);

  useEffect(() => {
    st.current.tx = activeCenter();
    wakeRef.current();
  }, [active, items]);

  useLayoutEffect(() => {
    snapToActive();
  }, []);

  useLayoutEffect(() => {
    const dock = lensRef.current?.parentElement?.closest?.('.mobile-dock') || lensRef.current?.parentElement;
    if (!dock) return undefined;

    const onDown = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const s = st.current;
      s.down = true;
      s.dragging = false;
      s.wasDrag = false;
      s.startX = event.clientX;
      s.ts = 1.14;
      const rel = event.clientX - dock.getBoundingClientRect().left;
      const n = nearest(rel);
      if (n) s.tx = n.x;
      wakeRef.current();
    };

    const onMove = (event) => {
      const s = st.current;
      if (!s.down) return;
      const dx = event.clientX - s.startX;
      if (!s.dragging && Math.abs(dx) > DRAG_THRESHOLD) {
        s.dragging = true;
        s.wasDrag = true;
        try {
          dock.setPointerCapture(event.pointerId);
        } catch (e) {
          void 0;
        }
      }
      if (s.dragging) {
        const rel = event.clientX - dock.getBoundingClientRect().left;
        s.x = s.tx = rel;
        s.vx = 0;
        s.ts = 1.12;
        const target = nearest(rel);
        dock.querySelectorAll('.dock-link').forEach((el) => {
          el.classList.toggle('is-hover', !!target && el.getAttribute('data-nav') === target.key);
        });
        wakeRef.current();
      }
    };

    const onUp = (event) => {
      const s = st.current;
      if (!s.down) return;
      const wasDragging = s.dragging;
      s.down = false;
      s.dragging = false;
      s.ts = 1;
      dock.querySelectorAll('.dock-link').forEach((el) => el.classList.remove('is-hover'));
      if (wasDragging) {
        const rel = event.clientX - dock.getBoundingClientRect().left;
        const target = nearest(rel);
        if (target && target.key !== active) {
          s.tx = target.x;
          window.location.hash = `#/${target.key}`;
        } else {
          s.tx = activeCenter();
        }
      } else {
        s.tx = activeCenter();
      }
      wakeRef.current();
      try {
        dock.releasePointerCapture(event.pointerId);
      } catch (e) {
        void 0;
      }
    };

    const onCancel = () => {
      const s = st.current;
      s.down = false;
      s.dragging = false;
      s.ts = 1;
      dock.querySelectorAll('.dock-link').forEach((el) => el.classList.remove('is-hover'));
      s.tx = activeCenter();
      wakeRef.current();
    };

    const onClickCapture = (event) => {
      if (st.current.wasDrag) {
        event.preventDefault();
        event.stopPropagation();
        st.current.wasDrag = false;
      }
    };

    const ro = new ResizeObserver(() => {
      if (!st.current.dragging) snapToActive();
    });
    ro.observe(dock);
    window.addEventListener('resize', onCancel);

    dock.addEventListener('pointerdown', onDown);
    dock.addEventListener('pointermove', onMove);
    dock.addEventListener('pointerup', onUp);
    dock.addEventListener('pointercancel', onCancel);
    dock.addEventListener('click', onClickCapture, true);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onCancel);
      dock.removeEventListener('pointerdown', onDown);
      dock.removeEventListener('pointermove', onMove);
      dock.removeEventListener('pointerup', onUp);
      dock.removeEventListener('pointercancel', onCancel);
      dock.removeEventListener('click', onClickCapture, true);
    };
  }, [active, items]);

  return (
    <div ref={lensRef} className="dock-lens" aria-hidden="true" />
  );
}
