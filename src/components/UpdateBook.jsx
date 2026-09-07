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
  const swipeRef = useRef(null);
  const count = entries.length;

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

  if (!count) return null;

  const go = (direction) => {
    setIndex((current) => Math.min(count - 1, Math.max(0, current + direction)));
  };

  const shouldTrackPointer = () =>
    window.matchMedia?.('(max-width: 760px)').matches ||
    window.matchMedia?.('(pointer: coarse)').matches;

  const onPointerDown = (event) => {
    if (!shouldTrackPointer()) return;
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
    <div className="update-book">
      <div
        className="update-book__stage"
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
