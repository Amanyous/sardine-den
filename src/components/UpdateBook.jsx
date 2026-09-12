import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AXIS_MIN = 12;
const AXIS_RATIO = 1.25;
const DIAGONAL_FALLBACK = 28;
const FLICK_VELOCITY = 0.35;
const SNAP_DURATION = 340;

function EntrySheet({ entry }) {
  return (
    <article className="update-book__entry">
      <div className="update-book__entry-head">
        <span className="update-book__version">{entry.version}</span>
        <time dateTime={entry.date}>{entry.date}</time>
      </div>
      <h3>{entry.title}</h3>
      <ul className="update-book__items">
        {entry.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export default function UpdateBook({ entries = [] }) {
  const [index, setIndex] = useState(0);
  const [moving, setMoving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const gestureRef = useRef(null);
  const dragOffsetRef = useRef(0);
  const wheelAccumRef = useRef(0);
  const stageRef = useRef(null);
  const sheetRefs = useRef([]);
  const indexRef = useRef(0);
  const movingTimerRef = useRef(null);
  const count = entries.length;
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const resetDrag = () => {
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setDragging(false);
  };

  const resistDrag = (dx) => {
    const current = indexRef.current;
    const atStart = current <= 0 && dx > 0;
    const atEnd = current >= count - 1 && dx < 0;
    return atStart || atEnd ? dx * 0.24 : dx;
  };

  const beginSnap = (nextIndex) => {
    if (!count) return;
    const target = Math.min(count - 1, Math.max(0, nextIndex));
    window.clearTimeout(movingTimerRef.current);
    wheelAccumRef.current = 0;
    resetDrag();

    if (target !== indexRef.current) {
      indexRef.current = target;
      if (sheetRefs.current[target]) sheetRefs.current[target].scrollTop = 0;
      setIndex(target);
    }

    if (reduced) {
      setMoving(false);
      return;
    }

    setMoving(true);
    movingTimerRef.current = window.setTimeout(() => {
      setMoving(false);
    }, SNAP_DURATION + 40);
  };

  const settleDrag = (dx, velocity = 0) => {
    const width = stageRef.current?.clientWidth || 320;
    const threshold = Math.min(88, Math.max(40, width * 0.16));
    const offset = dragOffsetRef.current;
    const movement = Math.abs(offset) > 1 ? offset : dx || velocity;
    const shouldTurn = Math.abs(offset) >= threshold || Math.abs(velocity) >= FLICK_VELOCITY;
    const direction = shouldTurn && movement < 0 ? 1 : shouldTurn ? -1 : 0;
    beginSnap(indexRef.current + direction);
  };

  useEffect(() => () => window.clearTimeout(movingTimerRef.current), []);

  if (!count) return null;

  const go = (direction) => {
    const next = Math.min(count - 1, Math.max(0, indexRef.current + direction));
    if (next !== indexRef.current) beginSnap(next);
  };

  const onKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    go(event.key === 'ArrowLeft' ? -1 : 1);
  };

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    resetDrag();
    gestureRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: performance.now(),
      locked: null,
      velocity: 0,
    };
  };

  const onPointerMove = (event) => {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!gesture.locked && Math.max(absX, absY) >= AXIS_MIN) {
      if (absX > absY * AXIS_RATIO) {
        gesture.locked = 'horizontal';
        setDragging(true);
        try {
          event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
          void 0;
        }
      } else if (absY > absX * AXIS_RATIO) {
        gestureRef.current = null;
        resetDrag();
        return;
      } else if (Math.max(absX, absY) >= DIAGONAL_FALLBACK) {
        if (absX > absY) {
          gesture.locked = 'horizontal';
          setDragging(true);
          try {
            event.currentTarget.setPointerCapture?.(event.pointerId);
          } catch {
            void 0;
          }
        } else {
          gestureRef.current = null;
          resetDrag();
          return;
        }
      }
    }

    if (gesture.locked === 'horizontal') {
      if (event.cancelable) event.preventDefault();
      const now = performance.now();
      const elapsed = Math.max(1, now - gesture.lastTime);
      gesture.velocity = (event.clientX - gesture.lastX) / elapsed;
      gesture.lastX = event.clientX;
      gesture.lastTime = now;
      const nextOffset = resistDrag(dx);
      dragOffsetRef.current = nextOffset;
      setDragOffset(nextOffset);
    }
  };

  const finishPointer = (event) => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (!gesture || event.pointerId !== gesture.id) return;
    if (gesture.locked !== 'horizontal') return;
    const dx = event.clientX - gesture.startX;
    const idle = performance.now() - gesture.lastTime;
    const velocity = idle > 120 ? 0 : gesture.velocity;
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      void 0;
    }
    settleDrag(dx, velocity);
  };

  const cancelPointer = () => {
    gestureRef.current = null;
    resetDrag();
  };

  const onWheel = (event) => {
    const absX = Math.abs(event.deltaX);
    const absY = Math.abs(event.deltaY);
    if (absX < absY * 1.4 || absX < 8) return;
    if (wheelAccumRef.current && Math.sign(wheelAccumRef.current) !== Math.sign(event.deltaX)) {
      wheelAccumRef.current = 0;
    }
    wheelAccumRef.current += event.deltaX;
    if (Math.abs(wheelAccumRef.current) < 36) return;
    const direction = wheelAccumRef.current > 0 ? 1 : -1;
    wheelAccumRef.current = 0;
    go(direction);
  };

  return (
    <div
      className={`update-book ${moving || dragging ? 'is-moving' : ''} ${dragging ? 'is-dragging' : ''}`}
      role="region"
      aria-label="更新日志"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div
        className="update-book__stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={cancelPointer}
        onWheel={onWheel}
      >
        {entries.map((entry, entryIndex) => {
          const delta = entryIndex - index;
          const distance = Math.abs(delta);
          const style = {
            opacity: distance > 1 ? 0 : 1,
            pointerEvents: entryIndex === index ? 'auto' : 'none',
            transform: `translate3d(calc(${delta * 112}% + ${dragOffset}px), 0, 0) rotateY(${delta * -9}deg) scale(${Math.max(
              0.92,
              1 - distance * 0.03,
            )})`,
            zIndex: 100 - distance,
          };
          return (
            <div
              className="update-book__sheet"
              ref={(node) => {
                sheetRefs.current[entryIndex] = node;
              }}
              style={style}
              key={`${entry.date}-${entry.version}`}
            >
              <EntrySheet entry={entry} />
            </div>
          );
        })}
      </div>

      <div className="update-book__controls">
        <button
          className="update-book__nav"
          type="button"
          aria-label="上一版本"
          disabled={index === 0}
          onClick={() => go(-1)}
        >
          <ChevronLeft size={18} strokeWidth={1.9} aria-hidden="true" />
        </button>
        <span className="update-book__progress" aria-live="polite">
          {index + 1} / {count}
        </span>
        <button
          className="update-book__nav"
          type="button"
          aria-label="下一版本"
          disabled={index === count - 1}
          onClick={() => go(1)}
        >
          <ChevronRight size={18} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
