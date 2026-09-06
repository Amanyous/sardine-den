import { useEffect, useMemo, useRef, useState } from 'react';
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
  const rootRef = useRef(null);
  const audioRef = useRef(null);
  const lyricsListRef = useRef(null);
  const track = tracks[0] || null;

  useEffect(() => {
    if (!track?.lrc) {
      setSyncedLyrics([]);
      return undefined;
    }
    let cancelled = false;
    fetch(track.lrc)
      .then((response) => response.text())
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

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        void 0;
      }
    } else {
      audio.pause();
    }
  };

  const seek = (event) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Number(event.target.value);
    audio.currentTime = next;
    setTime(next);
  };

  return (
    <div className={`music-button ${playing ? 'is-playing' : ''}`} ref={rootRef}>
      {track ? (
        <audio
          ref={audioRef}
          src={track.src}
          preload="metadata"
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setTime(0);
          }}
        />
      ) : null}

      <button
        className="music-toggle"
        type="button"
        aria-label="音乐播放器"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="music-toggle__glass" aria-hidden="true" />
        <Disc3 size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <LiquidSurface
        className={`music-panel ${open ? 'is-open' : ''}`}
        cornerRadius={24}
        role="dialog"
        ariaLabel="音乐播放器"
      >
        {track ? (
          <div className="music-player">
            <div className="music-player__top">
              <div className="music-player__cover">
                <img src={track.cover} alt="" />
                <button
                  className="music-player__play"
                  type="button"
                  aria-label={playing ? '暂停' : '播放'}
                  onClick={togglePlay}
                >
                  {playing ? (
                    <Pause size={18} strokeWidth={2.2} aria-hidden="true" />
                  ) : (
                    <Play size={18} strokeWidth={2.2} aria-hidden="true" fill="currentColor" />
                  )}
                </button>
              </div>
              <div className="music-player__info">
                <strong>{track.title}</strong>
                <small>{track.artist}</small>
              </div>
            </div>

            <div className="music-player__seek">
              <span>{formatTime(time)}</span>
              <input
                className="music-player__range"
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={Math.min(time, duration || 0)}
                aria-label="播放进度"
                onChange={seek}
              />
              <span>{formatTime(duration)}</span>
            </div>

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
