import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const swipeRef = useRef(null);
  const touchRef = useRef(null);
  const stageRef = useRef(null);
  const indexRef = useRef(0);
  const movingTimerRef = useRef(null);
  const count = entries.length;

  useEffect(() => {
    if (indexRef.current === index) return undefined;
    indexRef.current = index;
    setMoving(true);
    clearTimeout(movingTimerRef.current);
    movingTimerRef.current = window.setTimeout(() => setMoving(false), 700);
    return () => clearTimeout(movingTimerRef.current);
  }, [index]);

  useEffect(() => {
    if (!count) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        setIndex((current) => Math.min(count - 1, Math.max(0, current + direction)));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [count]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const onTouchStart = (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      touchRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        locked: null,
      };
    };

    const onTouchMove = (event) => {
      const gesture = touchRef.current;
      if (!gesture || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - gesture.x;
      const dy = touch.clientY - gesture.y;

      if (!gesture.locked && Math.abs(dx) > 10) {
        if (Math.abs(dx) > Math.abs(dy)) {
          gesture.locked = 'horizontal';
          if (event.cancelable) event.preventDefault();
        } else if (Math.abs(dy) > Math.abs(dx)) {
          gesture.locked = 'vertical';
        }
      }
    };

    const onTouchEnd = (event) => {
      const gesture = touchRef.current;
      touchRef.current = null;
      if (!gesture || gesture.locked !== 'horizontal') return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - gesture.x;
      if (Math.abs(dx) < 56) return;
      setIndex((current) => Math.min(count - 1, Math.max(0, current + (dx < 0 ? 1 : -1))));
    };

    const onTouchCancel = () => {
      touchRef.current = null;
    };

    stage.addEventListener('touchstart', onTouchStart, { passive: true });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    stage.addEventListener('touchend', onTouchEnd);
    stage.addEventListener('touchcancel', onTouchCancel);
    return () => {
      stage.removeEventListener('touchstart', onTouchStart);
      stage.removeEventListener('touchmove', onTouchMove);
      stage.removeEventListener('touchend', onTouchEnd);
      stage.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [count]);

  if (!count) return null;

  const go = (direction) => {
    setIndex((current) => Math.min(count - 1, Math.max(0, current + direction)));
  };

  const onPointerDown = (event) => {
    if (event.pointerType === 'touch') return;
    swipeRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      locked: null,
    };
  };

  const onPointerMove = (event) => {
    const gesture = swipeRef.current;
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.locked && Math.abs(dx) > 10) {
      if (Math.abs(dx) > Math.abs(dy)) {
        gesture.locked = 'horizontal';
      } else if (Math.abs(dy) > Math.abs(dx)) {
        gesture.locked = 'vertical';
      }
    }
  };

  const finishPointer = (event) => {
    const gesture = swipeRef.current;
    swipeRef.current = null;
    if (!gesture || event.pointerId !== gesture.id) return;
    if (gesture.locked !== 'horizontal') return;
    const dx = event.clientX - gesture.x;
    if (Math.abs(dx) < 56) return;
    go(dx < 0 ? 1 : -1);
  };

  const cancelPointer = () => {
    swipeRef.current = null;
  };

  return (
    <div className={`update-book ${moving ? 'is-moving' : ''}`}>
      <div
        className="update-book__stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={cancelPointer}
      >
        {entries.map((entry, entryIndex) => {
          const delta = entryIndex - index;
          const distance = Math.abs(delta);
          const style = {
            opacity: distance > 1 ? 0 : 1,
            pointerEvents: entryIndex === index ? 'auto' : 'none',
            transform: `translateX(${delta * 112}%) rotateY(${delta * -9}deg) scale(${Math.max(
              0.92,
              1 - distance * 0.03,
            )})`,
            zIndex: 100 - distance,
          };
          return (
            <div className="update-book__sheet" style={style} key={`${entry.date}-${entry.version}`}>
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
        <span className="update-book__progress">
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
