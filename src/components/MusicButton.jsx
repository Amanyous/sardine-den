import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Disc3, Pause, Play } from 'lucide-react';
import LiquidSurface from './LiquidSurface.jsx';
import './MusicButton.css';

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = String(whole % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
};

const parseLrc = (text) => {
  const lines = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const stamp = rawLine.match(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/);
    if (!stamp) continue;
    const minutes = Number(stamp[1]);
    const seconds = Number(stamp[2]);
    const fraction = Number(`0.${stamp[3] || '0'}`);
    const content = rawLine.replace(stamp[0], '').trim();
    if (content) lines.push({ time: minutes * 60 + seconds + fraction, text: content });
  }
  return lines.sort((a, b) => a.time - b.time);
};

export default function MusicButton({ tracks = [] }) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [syncedLyrics, setSyncedLyrics] = useState([]);
  const [titleOverflow, setTitleOverflow] = useState(false);
  const [playError, setPlayError] = useState(false);
  const rootRef = useRef(null);
  const audioRef = useRef(null);
  const lyricsListRef = useRef(null);
  const panelRef = useRef(null);
  const titleRef = useRef(null);
  const toggleRef = useRef(null);
  const panelId = `music-panel-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const track = tracks[0] || null;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;

  useEffect(() => {
    if (!track?.lrc) {
      setSyncedLyrics([]);
      return undefined;
    }
    let cancelled = false;
    fetch(track.lrc)
      .then((response) => {
        if (!response.ok) throw new Error(`Lyrics request failed: ${response.status}`);
        return response.text();
      })
      .then((text) => {
        if (!cancelled) setSyncedLyrics(parseLrc(text));
      })
      .catch(() => {
        if (!cancelled) setSyncedLyrics([]);
      });
    return () => {
      cancelled = true;
    };
  }, [track]);

  useEffect(() => {
    setTime(0);
    setDuration(0);
    setPlayError(false);
  }, [track?.src]);

  useLayoutEffect(() => {
    const checkTitle = () => {
      const el = titleRef.current;
      if (!el) return;
      setTitleOverflow(el.scrollWidth > el.clientWidth + 1);
    };
    const frame = requestAnimationFrame(checkTitle);
    window.addEventListener('resize', checkTitle);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', checkTitle);
    };
  }, [track?.title, open]);

  const lyricLine = useMemo(() => {
    if (!syncedLyrics.length) return -1;
    let current = -1;
    for (let index = 0; index < syncedLyrics.length; index += 1) {
      if (time >= syncedLyrics[index].time) current = index;
      else break;
    }
    return current;
  }, [time, syncedLyrics]);

  useEffect(() => {
    const list = lyricsListRef.current;
    if (!open || !list) return undefined;
    const active = list.querySelector('[data-active="true"]');
    if (!active) return undefined;

    const listRect = list.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const relativeTop = activeRect.top - listRect.top;
    const top = Math.max(
      0,
      list.scrollTop + relativeTop - (list.clientHeight - activeRect.height) / 2,
    );
    list.scrollTo({
      top,
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    return undefined;
  }, [open, lyricLine, track]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    const previous = document.activeElement;
    const first = panel?.querySelector('button:not([disabled]), input:not([disabled]), [href]');
    first?.focus({ preventScroll: true });

    return () => {
      if (panel?.contains(document.activeElement)) {
        previous?.focus?.({ preventScroll: true });
      }
    };
  }, [open]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        setPlayError(false);
        await audio.play();
      } catch {
        setPlayError(true);
      }
    } else {
      audio.pause();
    }
  };

  const toggleOpen = () => {
    setOpen((value) => {
      const next = !value;
      const audio = audioRef.current;
      if (next && audio?.readyState === 0) {
        audio.preload = 'metadata';
        audio.load();
      }
      return next;
    });
  };

  const seek = (event) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.min(safeDuration, Math.max(0, Number(event.target.value)));
    if (!Number.isFinite(next)) return;
    audio.currentTime = next;
    setTime(next);
  };

  return (
    <div className={`music-button ${playing ? 'is-playing' : ''}`} ref={rootRef}>
      {track ? (
        <audio
          ref={audioRef}
          src={track.src}
          preload="none"
          onLoadedMetadata={(event) => {
            const nextDuration = event.currentTarget.duration;
            setDuration(Number.isFinite(nextDuration) && nextDuration > 0 ? nextDuration : 0);
          }}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onPlay={() => {
            setPlaying(true);
            setPlayError(false);
          }}
          onPause={() => setPlaying(false)}
          onError={() => {
            setPlaying(false);
            setPlayError(true);
          }}
          onEnded={() => {
            setPlaying(false);
            setTime(0);
          }}
        />
      ) : null}

      <button
        ref={toggleRef}
        className="music-toggle"
        type="button"
        aria-label={open ? '关闭音乐播放器' : '打开音乐播放器'}
        aria-controls={panelId}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggleOpen}
      >
        <span className="music-toggle__glass" aria-hidden="true" />
        <Disc3 size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <LiquidSurface
        surfaceRef={panelRef}
        id={panelId}
        className={`music-panel ${open ? 'is-open' : ''}`}
        cornerRadius={24}
        role="dialog"
        ariaLabel="音乐播放器"
        ariaHidden={open ? undefined : true}
      >
        {track ? (
          <div className="music-player">
            <div className="music-player__top">
              <div className="music-player__cover">
                <img src={track.cover} alt="" width="720" height="720" />
              </div>
              <div className="music-player__info">
                <strong
                  ref={titleRef}
                  className={`music-player__title ${titleOverflow ? 'is-marquee' : ''}`}
                  title={track.title}
                >
                  {titleOverflow ? (
                    <span className="music-player__marquee">
                      <span className="music-player__marquee-track">{track.title}</span>
                      <span className="music-player__marquee-track" aria-hidden="true">
                        {track.title}
                      </span>
                    </span>
                  ) : (
                    track.title
                  )}
                </strong>
                <small>{track.artist}</small>
                <button
                  className="music-player__play"
                  type="button"
                  aria-label={playing ? '暂停' : '播放'}
                  onClick={togglePlay}
                >
                  {playing ? (
                    <Pause size={16} strokeWidth={2.2} aria-hidden="true" />
                  ) : (
                    <Play size={16} strokeWidth={2.2} aria-hidden="true" fill="currentColor" />
                  )}
                </button>
              </div>
            </div>

            <div className="music-player__seek">
              <span>{formatTime(time)}</span>
              <input
                className="music-player__range"
                type="range"
                min="0"
                max={safeDuration}
                step="0.1"
                value={Math.min(time, safeDuration)}
                style={{
                  '--range-progress': safeDuration
                    ? `${Math.min(100, (Math.min(time, safeDuration) / safeDuration) * 100)}%`
                    : '0%',
                }}
                aria-label="播放进度"
                onChange={seek}
              />
              <span>{formatTime(safeDuration)}</span>
            </div>

            {playError ? (
              <p className="music-player__error" role="alert">
                无法播放这首歌，请检查音频资源或网络。
              </p>
            ) : null}

            {(syncedLyrics.length || track.lyrics?.length) ? (
              <div className="music-player__lyrics">
                <span className="music-player__lyrics-title">歌词</span>
                <div className="music-player__lyrics-list" ref={lyricsListRef}>
                  {(syncedLyrics.length ? syncedLyrics : track.lyrics.map((line) => ({ text: line }))).map((line, index) => (
                    <p
                      key={`${line.text}-${index}`}
                      data-active={index === lyricLine || undefined}
                      aria-current={index === lyricLine ? 'true' : undefined}
                    >
                      {line.text}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="music-panel__empty">
            <Disc3 size={22} strokeWidth={1.5} aria-hidden="true" />
            <p>还没有曲目</p>
          </div>
        )}
      </LiquidSurface>
    </div>
  );
}
