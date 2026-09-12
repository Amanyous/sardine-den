import { lazy, memo, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { gsap } from 'gsap';
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Github,
  Home,
  Laptop,
  Mail,
  Moon,
  Sparkles,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import GlassIcons from './components/reactbits/GlassIcons.jsx';
import LiquidSurface from './components/LiquidSurface.jsx';
import GlassDefs from './components/GlassDefs.jsx';
import MusicButton from './components/MusicButton.jsx';
import HelloStroke from './components/HelloStroke.jsx';
import StrokeText from './components/reactbits/StrokeText.jsx';
import DockLens from './components/DockLens.jsx';
import UpdateBook from './components/UpdateBook.jsx';
import ScrollHint from './components/ScrollHint.jsx';
import {
  changelog,
  devices,
  favorites,
  playerTrack,
  site,
  themePalettes,
} from './data/site.js';

const LiquidEther = lazy(() => import('./components/reactbits/LiquidEther.jsx'));

const ROUTES = ['home', 'about', 'articles', 'devices'];

const navItems = [
  { key: 'home', label: '首页', href: '#/', icon: Home },
  { key: 'devices', label: '设备', href: '#/devices', icon: Laptop },
  { key: 'articles', label: '文章', href: '#/articles', icon: FileText },
  { key: 'about', label: '关于', href: '#/about', icon: UserRound },
];

const routeHash = (key) => (key === 'home' ? '#/' : `#/${key}`);

const contactItems = [
  {
    label: 'GitHub',
    href: site.github,
    target: '_blank',
    color: 'var(--accent)',
    icon: <Github size={22} strokeWidth={1.8} aria-hidden="true" />,
  },
  {
    label: '邮箱',
    href: `mailto:${site.email}`,
    color: 'var(--accent-2)',
    icon: <Mail size={22} strokeWidth={1.8} aria-hidden="true" />,
  },
];

const THEME_CYCLE = ['light', 'dark'];
const THEME_META = {
  light: { label: '浅色', icon: Sun },
  dark: { label: '深色', icon: Moon },
};

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, [query]);

  return matches;
}

function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

function useFinePointer() {
  return useMediaQuery('(hover: hover) and (pointer: fine)');
}

function useCompactNav() {
  return useMediaQuery('(max-width: 760px)');
}

function useNavMorph({ compact, desktopRef, dockRef, topbarRef, reduced }) {
  const topRectsRef = useRef([]);
  const dockRectsRef = useRef([]);
  const previousRef = useRef(compact);
  const animationsRef = useRef([]);
  const topbarWideRef = useRef(0);
  const topbarCompactRef = useRef(0);

  const readTopRects = () => {
    const nav = desktopRef.current;
    if (!nav) return [];
    return Array.from(nav.querySelectorAll('.nav-link')).map((el) => {
      const rect = el.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    });
  };

  const readDockRects = () => {
    const dock = dockRef.current;
    if (!dock) return [];
    return Array.from(dock.querySelectorAll('.dock-link')).map((el) => {
      const rect = el.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    });
  };

  const cancelAnimations = () => {
    animationsRef.current.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        void 0;
      }
    });
    animationsRef.current = [];
  };

  const cacheTopbarWidth = () => {
    const el = topbarRef.current;
    if (!el) return;
    const width = el.getBoundingClientRect().width;
    if (compact) topbarCompactRef.current = width;
    else topbarWideRef.current = width;
  };

  const animateTopbarWidth = (fromPx, toPx) => {
    if (!fromPx || !toPx) return;
    const el = topbarRef.current;
    if (!el) return;

    el.style.overflow = 'hidden';
    el.style.width = `${fromPx}px`;
    const animation = el.animate(
      [{ width: `${fromPx}px` }, { width: `${toPx}px` }],
      { duration: 620, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'both' },
    );
    animationsRef.current.push(animation);

    const restore = () => {
      el.style.width = '';
      el.style.overflow = '';
    };
    animation.finished.then(restore).catch(restore);
  };

  const flyLinks = (from, to, source) => {
    const nodes = source ? Array.from(source.querySelectorAll('.nav-link, .dock-link')) : [];
    const ease = 'cubic-bezier(0.32, 0.72, 0, 1)';
    const duration = 620;
    const stagger = 26;

    nodes.forEach((node, index) => {
      const start = from[index];
      const end = to[index];
      if (!node || !start || !end) return;

      const clone = node.cloneNode(true);
      clone.removeAttribute('id');
      clone.setAttribute('aria-hidden', 'true');
      Object.assign(clone.style, {
        position: 'fixed',
        left: `${start.left}px`,
        top: `${start.top}px`,
        width: `${start.width}px`,
        height: `${start.height}px`,
        margin: '0',
        zIndex: '70',
        pointerEvents: 'none',
        transformOrigin: '50% 50%',
        willChange: 'transform, opacity',
      });
      document.body.appendChild(clone);

      const dx = end.left - start.left;
      const dy = end.top - start.top;
      const scaleX = end.width / start.width;
      const scaleY = end.height / start.height;
      const animation = clone.animate(
        [
          { transform: 'translate(0px, 0px) scale(1, 1)', opacity: 1, offset: 0 },
          {
            transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
            opacity: 1,
            offset: 0.78,
          },
          {
            transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
            opacity: 0,
            offset: 1,
          },
        ],
        { duration, delay: index * stagger, easing: ease, fill: 'both' },
      );

      animationsRef.current.push(animation);
      animation.finished
        .then(() => clone.remove())
        .catch(() => clone.remove());
    });

    window.setTimeout(() => cancelAnimations(), duration + nodes.length * stagger + 140);
  };

  useLayoutEffect(() => {
    const previous = previousRef.current;
    const goingCompact = compact && !previous;
    const goingWide = !compact && previous;

    if (compact) dockRectsRef.current = readDockRects();
    if (!compact) topRectsRef.current = readTopRects();
    cacheTopbarWidth();

    if (!reduced && (goingCompact || goingWide)) {
      const start = goingCompact ? topRectsRef.current : dockRectsRef.current;
      const end = goingCompact ? dockRectsRef.current : topRectsRef.current;
      const source = goingCompact ? desktopRef.current : dockRef.current;
      flyLinks(start, end, source);

      const wideStart = Math.min(topbarWideRef.current, window.innerWidth - 24);
      const from = goingCompact ? wideStart : topbarCompactRef.current;
      const to = goingCompact ? topbarCompactRef.current : topbarWideRef.current;
      animateTopbarWidth(from, to);
    }

    previousRef.current = compact;

    const cacheRects = () => {
      if (compact) dockRectsRef.current = readDockRects();
      else topRectsRef.current = readTopRects();
      cacheTopbarWidth();
    };

    window.addEventListener('resize', cacheRects);
    return () => {
      window.removeEventListener('resize', cacheRects);
      cancelAnimations();
    };
  }, [compact, reduced]);
}

function useDesktopNavDrag({ navRef, activeKey, reduced }) {
  const stRef = useRef({});
  const activeKeyRef = useRef(activeKey);

  useEffect(() => {
    activeKeyRef.current = activeKey;
  }, [activeKey]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || reduced) return undefined;

    const st = stRef.current;
    let pill = null;

    const readItems = () =>
      Array.from(nav.querySelectorAll('.nav-link')).map((el) => {
        const left = el.offsetLeft;
        const width = el.offsetWidth;
        return { key: el.getAttribute('data-nav'), left, width, center: left + width / 2 };
      });

    const readActive = () => {
      const activeEl = nav.querySelector('.nav-link.is-active');
      const list = readItems();
      const key = activeEl?.getAttribute('data-nav');
      return list.find((item) => item.key === key) || list[0];
    };

    const nearest = (x, list) => {
      let best = list[0];
      let minDistance = Infinity;
      list.forEach((item) => {
        const distance = Math.abs(item.center - x);
        if (distance < minDistance) {
          minDistance = distance;
          best = item;
        }
      });
      return best;
    };

    const place = (left, width, animate) => {
      if (!pill) return;
      pill.style.transition = animate ? '' : 'none';
      pill.style.transform = `translateX(${left}px)`;
      pill.style.width = `${width}px`;
      pill.style.opacity = '1';
    };

    const onPointerDown = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const active = readActive();
      pill = nav.querySelector('.desktop-nav__pill');
      if (!active || !pill) return;

      const rect = nav.getBoundingClientRect();
      Object.assign(st, {
        down: true,
        dragging: false,
        wasDrag: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        navRect: rect,
        grabOffset: event.clientX - rect.left - active.left,
        activeWidth: active.width,
      });
    };

    const onPointerMove = (event) => {
      if (!st.down || event.pointerId !== st.pointerId) return;

      if (!st.dragging && Math.abs(event.clientX - st.startX) > 7) {
        st.dragging = true;
        st.wasDrag = true;
        try {
          nav.setPointerCapture(event.pointerId);
        } catch (err) {
          void 0;
        }
        pill.style.willChange = 'transform, width';
      }

      if (!st.dragging) return;

      const list = readItems();
      const first = list[0];
      const last = list[list.length - 1];
      const pointerX = event.clientX - st.navRect.left;
      const maxLeft = last.left + last.width - st.activeWidth;
      const left = Math.min(Math.max(pointerX - st.grabOffset, first.left), maxLeft);
      place(left, st.activeWidth, false);
    };

    const finishDrag = (event) => {
      if (!st.down || event.pointerId !== st.pointerId) return;
      const wasDrag = st.wasDrag;
      st.down = false;
      st.dragging = false;

      if (!wasDrag) return;

      try {
        nav.releasePointerCapture(event.pointerId);
      } catch (err) {
        void 0;
      }
      if (pill) pill.style.willChange = 'auto';

      const list = readItems();
      const pointerX = event.clientX - st.navRect.left;
      const pillCenter = pointerX - st.grabOffset + st.activeWidth / 2;
      const target = nearest(pillCenter, list);
      const currentKey = activeKeyRef.current;

      if (target && target.key !== currentKey) {
        place(target.left, target.width, true);
        window.location.hash = `#/${target.key}`;
      } else {
        const active = list.find((item) => item.key === currentKey) || list[0];
        place(active.left, active.width, true);
      }
    };

    const cancelDrag = () => {
      if (!st.down) return;
      const wasDrag = st.wasDrag;
      st.down = false;
      st.dragging = false;
      st.wasDrag = false;
      if (wasDrag && pill) {
        pill.style.willChange = 'auto';
        const active = readActive();
        place(active.left, active.width, true);
      }
    };

    const onClickCapture = (event) => {
      if (!st.wasDrag) return;
      event.preventDefault();
      event.stopPropagation();
      st.wasDrag = false;
    };

    nav.addEventListener('pointerdown', onPointerDown);
    nav.addEventListener('pointermove', onPointerMove);
    nav.addEventListener('pointerup', finishDrag);
    nav.addEventListener('pointercancel', cancelDrag);
    nav.addEventListener('click', onClickCapture, true);

    return () => {
      nav.removeEventListener('pointerdown', onPointerDown);
      nav.removeEventListener('pointermove', onPointerMove);
      nav.removeEventListener('pointerup', finishDrag);
      nav.removeEventListener('pointercancel', cancelDrag);
      nav.removeEventListener('click', onClickCapture, true);
      if (pill) {
        pill.style.transition = '';
        pill.style.willChange = 'auto';
      }
    };
  }, [navRef, reduced]);
}

function useRoute() {
  const readRoute = () => {
    const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    const [routeName, articleId] = raw.split('/');
    const known = ROUTES.includes(routeName);
    return {
      route: known ? routeName : 'home',
      articleId: known && routeName === 'articles' && articleId ? decodeURIComponent(articleId) : null,
      notFound: Boolean(raw) && !known,
    };
  };

  const [location, setLocation] = useState(readRoute);

  const navigate = (nextRoute, nextArticleId = null) => {
    if (!ROUTES.includes(nextRoute)) return;
    const nextHash = nextRoute === 'articles' && nextArticleId
      ? `#/articles/${encodeURIComponent(nextArticleId)}`
      : routeHash(nextRoute);
    window.history.pushState(null, '', nextHash);
    setLocation({
      route: nextRoute,
      articleId: nextRoute === 'articles' ? nextArticleId : null,
      notFound: false,
    });
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#/');
    const update = () => {
      setLocation(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);

  return { ...location, navigate };
}

function useSwipePages({ route }) {
  const pointerRef = useRef(null);
  const suppressClickRef = useRef(false);
  const settleTimerRef = useRef(null);
  const [swiping, setSwiping] = useState(false);
  const [swipeSlot, setSwipeSlot] = useState(null);

  useLayoutEffect(() => {
    const main = document.querySelector('.site-main');
    const track = main?.querySelector('.page-track');
    if (!main || !track) return undefined;

    const shouldTrack = () =>
      window.matchMedia?.('(max-width: 760px)').matches ||
      window.matchMedia?.('(pointer: coarse)').matches;

    const order = navItems.map((item) => item.key);
    const routeIndex = order.indexOf(route);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const setTrack = (x) => {
      track.style.transform = `translate3d(${x}px, 0, 0)`;
      track.style.setProperty(
        '--swipe-progress',
        Math.min(1, Math.abs(x) / Math.max(1, main.clientWidth)),
      );
    };

    const resetTrack = () => {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
      track.style.transition = 'none';
      setTrack(0);
      main.classList.remove('is-swiping');
      setSwiping(false);
      setSwipeSlot(null);
    };

    const settle = (x, nextRoute) => {
      const duration = reduced ? 0 : 260;
      main.classList.add('is-swiping');
      track.style.transition = duration
        ? 'transform 260ms cubic-bezier(0.25, 0.1, 0.25, 1)'
        : 'none';
      setTrack(x);
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => {
        if (nextRoute) window.location.hash = routeHash(nextRoute);
        requestAnimationFrame(resetTrack);
      }, duration);
    };

    const onPointerDown = (event) => {
      if (!shouldTrack()) return;
      const target = event.target.closest?.(
        '.mobile-dock, .music-panel, .music-button, .theme-toggle, .update-book',
      );
      if (target) {
        pointerRef.current = null;
        return;
      }
      resetTrack();
      pointerRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        lastX: event.clientX,
        lastTime: performance.now(),
        velocity: 0,
        locked: null,
      };
    };

    const onPointerMove = (event) => {
      const pointer = pointerRef.current;
      if (!pointer || event.pointerId !== pointer.pointerId) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;

      if (!pointer.locked && Math.abs(dx) > 8) {
        if (Math.abs(dx) > Math.abs(dy)) {
          pointer.locked = 'horizontal';
          setSwipeSlot(dx < 0 ? 'next' : 'prev');
          setSwiping(true);
          try {
            main.setPointerCapture(event.pointerId);
          } catch (err) {
            void 0;
          }
        } else if (Math.abs(dy) > Math.abs(dx)) {
          pointer.locked = 'vertical';
          pointerRef.current = null;
        }
      }
      if (pointer.locked === 'horizontal') {
        const atStart = dx > 0 && routeIndex <= 0;
        const atEnd = dx < 0 && routeIndex >= order.length - 1;
        setTrack(atStart || atEnd ? dx * 0.24 : dx);
        const now = performance.now();
        const elapsed = Math.max(1, now - pointer.lastTime);
        pointer.velocity = (event.clientX - pointer.lastX) / elapsed;
        pointer.lastX = event.clientX;
        pointer.lastTime = now;
      }
    };

    const onPointerUp = (event) => {
      const pointer = pointerRef.current;
      pointerRef.current = null;
      if (!pointer || event.pointerId !== pointer.pointerId) return;
      if (pointer.locked !== 'horizontal') return;

      const dx = event.clientX - pointer.x;
      const idle = performance.now() - pointer.lastTime;
      const velocity = idle > 120 ? 0 : pointer.velocity;
      const threshold = Math.min(64, Math.max(36, main.clientWidth * 0.14));
      const movement = Math.abs(dx) >= threshold ? dx : velocity;
      const direction = movement < 0 ? 'left' : 'right';
      const nextIndex = direction === 'left' ? routeIndex + 1 : routeIndex - 1;
      const next = order[nextIndex];
      if ((Math.abs(dx) < threshold && Math.abs(velocity) < 0.35) || !next) {
        settle(0);
        return;
      }

      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 450);
      settle(direction === 'left' ? -main.clientWidth : main.clientWidth, next);
    };

    const onPointerCancel = () => {
      const pointer = pointerRef.current;
      pointerRef.current = null;
      if (pointer?.locked === 'horizontal') settle(0);
      else resetTrack();
    };

    const onClickCapture = (event) => {
      if (!suppressClickRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
    };

    main.addEventListener('pointerdown', onPointerDown);
    main.addEventListener('pointermove', onPointerMove);
    main.addEventListener('pointerup', onPointerUp);
    main.addEventListener('pointercancel', onPointerCancel);
    document.addEventListener('click', onClickCapture, true);

    return () => {
      main.removeEventListener('pointerdown', onPointerDown);
      main.removeEventListener('pointermove', onPointerMove);
      main.removeEventListener('pointerup', onPointerUp);
      main.removeEventListener('pointercancel', onPointerCancel);
      document.removeEventListener('click', onClickCapture, true);
      resetTrack();
    };
  }, [route]);

  return { swiping, swipeSlot };
}

function useScrollBounce() {
  useEffect(() => {
    const stack = document.querySelector('.site-stack');
    if (!stack) return undefined;

    const shouldTrack = () =>
      window.matchMedia?.('(max-width: 760px)').matches ||
      window.matchMedia?.('(pointer: coarse)').matches;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const state = { active: false, locked: null, applied: false };
    let resetTimer;

    const reset = () => {
      if (!state.applied) return;
      state.applied = false;
      stack.style.transition = reduced
        ? 'none'
        : 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)';
      stack.style.transform = 'translate3d(0, 0, 0)';
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        stack.style.transition = 'none';
        stack.style.willChange = 'auto';
      }, reduced ? 0 : 320);
    };

    const onTouchStart = (event) => {
      if (!shouldTrack() || event.touches.length !== 1) return;
      if (event.target.closest?.('.mobile-dock, .music-panel, .music-button, .theme-toggle, .update-book')) return;
      state.active = true;
      state.locked = null;
      state.startX = event.touches[0].clientX;
      state.startY = event.touches[0].clientY;
    };

    const onTouchMove = (event) => {
      if (!state.active || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - state.startX;
      const dy = event.touches[0].clientY - state.startY;

      if (!state.locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        state.locked = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      }
      if (state.locked !== 'vertical') return;

      const scroller = document.scrollingElement || document.documentElement;
      const atTop = scroller.scrollTop <= 0;
      const atBottom = scroller.scrollTop + window.innerHeight >= scroller.scrollHeight - 1;
      if (!(atTop && dy > 0) && !(atBottom && dy < 0)) {
        reset();
        return;
      }

      if (event.cancelable) event.preventDefault();
      state.applied = true;
      stack.style.transition = 'none';
      stack.style.willChange = 'transform';
      stack.style.transform = `translate3d(0, ${Math.sign(dy) * Math.min(96, Math.abs(dy) * 0.45)}px, 0)`;
    };

    const onTouchEnd = () => {
      state.active = false;
      state.locked = null;
      reset();
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.clearTimeout(resetTimer);
      stack.style.transform = 'translate3d(0, 0, 0)';
      stack.style.willChange = 'auto';
    };
  }, []);
}

function ThemeButton({ theme, onCycle, title }) {
  const meta = THEME_META[theme];
  const Icon = meta.icon;

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onCycle({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
      aria-label={title}
      title={title}
    >
      <span className="theme-toggle__glass" aria-hidden="true" />
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}

function FluidBackground({ resolvedTheme, reduced, fine, focused, interacting, running }) {
  const useWebGL = !reduced;
  const lowPower = !fine;

  return (
    <div className={reduced ? 'static-ambient' : 'css-liquid'} aria-hidden="true">
      {useWebGL ? (
        <Suspense fallback={null}>
          <LiquidEther
            className="liquid-background"
            colors={themePalettes[resolvedTheme]}
            lightMode={resolvedTheme === 'light'}
            backgroundColor={resolvedTheme === 'light' ? '#fff0f7' : '#191436'}
            resolution={lowPower ? 0.28 : 0.5}
            mouseForce={lowPower ? 12 : 20}
            cursorSize={lowPower ? 64 : 100}
            iterationsPoisson={lowPower ? 16 : 32}
            iterationsViscous={lowPower ? 8 : 32}
            dt={0.014}
            interactive={fine}
            maxFPS={lowPower ? 30 : focused ? interacting ? 60 : 30 : 30}
            autoDemo
            autoSpeed={lowPower ? 0.32 : 0.5}
            autoIntensity={lowPower ? 1.4 : 2.2}
            takeoverDuration={0.25}
            autoResumeDelay={3000}
            autoRampDuration={0.6}
            running={running}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

function EmptyState({ icon: Icon, title, lead }) {
  return (
    <LiquidSurface className="empty-glass" cornerRadius={28}>
      <div className="empty-state">
        <span className="empty-state__icon" aria-hidden="true">
          <Icon size={24} strokeWidth={1.7} />
        </span>
        <h2>{title}</h2>
        <p>{lead}</p>
      </div>
    </LiquidSurface>
  );
}

function ArticleImage({ block }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const thumbRef = useRef(null);
  const lightboxImageRef = useRef(null);
  const closeRef = useRef(null);
  const animationRef = useRef(null);
  const reduced = usePrefersReducedMotion();

  const closeImage = () => {
    if (!visible) return;
    const image = lightboxImageRef.current;
    const thumb = thumbRef.current;
    if (reduced || !image || !thumb) {
      setVisible(false);
      setOpen(false);
      return;
    }

    animationRef.current?.kill();
    const current = {
      x: Number(gsap.getProperty(image, 'x')) || 0,
      y: Number(gsap.getProperty(image, 'y')) || 0,
      scaleX: Number(gsap.getProperty(image, 'scaleX')) || 1,
      scaleY: Number(gsap.getProperty(image, 'scaleY')) || 1,
    };
    gsap.set(image, { x: 0, y: 0, scaleX: 1, scaleY: 1 });
    const base = image.getBoundingClientRect();
    gsap.set(image, current);
    const target = thumb.getBoundingClientRect();
    if (!base.width || !base.height) {
      setVisible(false);
      setOpen(false);
      return;
    }

    setVisible(false);
    animationRef.current = gsap.to(image, {
      x: target.left - base.left,
      y: target.top - base.top,
      scaleX: target.width / base.width,
      scaleY: target.height / base.height,
      duration: 0.42,
      ease: 'power3.inOut',
      onComplete: () => {
        animationRef.current = null;
        setOpen(false);
      },
    });
  };

  const openImage = () => {
    if (!thumbRef.current) return;
    animationRef.current?.kill();
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    const image = lightboxImageRef.current;
    const thumb = thumbRef.current;
    setVisible(true);
    if (reduced || !image || !thumb) return undefined;

    const base = image.getBoundingClientRect();
    const target = thumb.getBoundingClientRect();
    if (!base.width || !base.height) return undefined;
    const start = {
      x: target.left - base.left,
      y: target.top - base.top,
      scaleX: target.width / base.width,
      scaleY: target.height / base.height,
    };
    gsap.killTweensOf(image);
    gsap.set(image, { ...start, transformOrigin: 'top left' });
    animationRef.current = gsap.to(image, {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 0.46,
      ease: 'power3.out',
      onComplete: () => {
        animationRef.current = null;
      },
    });

    return () => animationRef.current?.kill();
  }, [open, reduced]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const previousOverflow = document.documentElement.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeImage();
    };

    document.addEventListener('keydown', onKeyDown);
    document.documentElement.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => () => animationRef.current?.kill(), []);

  if (!block.src) return null;

  return (
    <>
      <figure className="article__figure">
        <button
          className={`article__thumb ${open ? 'is-vt-hidden' : ''}`}
          type="button"
          onClick={openImage}
          aria-label={`查看原图：${block.alt || '文章图片'}`}
          aria-haspopup="dialog"
        >
          <img
            ref={thumbRef}
            className="article__img"
            src={block.thumb || block.src}
            alt={block.alt}
            width="1600"
            height="1000"
            loading="lazy"
            decoding="async"
          />
        </button>
        {block.caption ? <figcaption className="article__caption">{block.caption}</figcaption> : null}
      </figure>

      {open
        ? createPortal(
            <div
              className={`article-lightbox ${visible ? 'is-visible' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-label="原图预览"
              onClick={closeImage}
            >
              <div className="article-lightbox__inner" onClick={(event) => event.stopPropagation()}>
                <div className="article-lightbox__viewport">
                  <img
                    ref={lightboxImageRef}
                    className="article-lightbox__image"
                    src={block.src}
                    alt={block.alt}
                    width="1600"
                    height="1000"
                    draggable="false"
                  />
                </div>
                <button
                  ref={closeRef}
                  className="theme-toggle article-lightbox__close"
                  type="button"
                  onClick={closeImage}
                  aria-label="关闭原图"
                >
                  <span className="theme-toggle__glass" aria-hidden="true" />
                  <X size={20} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ArticleBlock({ block }) {
  switch (block.type) {
    case 'h2':
      return <h2 className="article__h2">{block.text}</h2>;
    case 'p':
      return <p className="article__p">{block.text}</p>;
    case 'list':
      return (
        <ul className="article__list">
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    case 'note':
      return <aside className="article__note">{block.text}</aside>;
    case 'img':
      return <ArticleImage block={block} />;
    default:
      return null;
  }
}

function ArticleView({ article, onBack }) {
  return (
    <article className="article">
      <button className="article__back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        <span>返回列表</span>
      </button>
      <header className="article__head">
        <span className="eyebrow">{article.tag}</span>
        <h1 className="article__title">{article.title}</h1>
        <p className="article__date">{article.date}</p>
        <p className="article__summary">{article.summary}</p>
      </header>
      <LiquidSurface className="article__card is-vt-target" cornerRadius={28}>
        <div className="article__body">
          {article.body.map((block, index) => (
            <ArticleBlock key={index} block={block} />
          ))}
        </div>
      </LiquidSurface>
    </article>
  );
}

function PageIntro({ eyebrow, title, lead }) {
  return (
    <div className="page-intro">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {lead ? <p>{lead}</p> : null}
    </div>
  );
}

const hostOf = (href) => {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

function HomePage({ ready }) {
  return (
    <>
      <section className="hero">
        <h1 className="visually-hidden">{site.headline}</h1>
        <div className="hero__copy">
          <p className="hero__kicker">{site.latinName}</p>
          {ready ? (
            <div className="hero__title" aria-hidden="true">
              <StrokeText
                className="hero__title-line hero__title-line--lead"
                text={site.headlineLead}
                strokeColor="var(--accent)"
                fillColor="var(--ink)"
                strokeWidth={1.2}
                drawDuration={1.45}
                fillDelay={0.35}
                stagger={0.05}
                ease="expo.out"
                fillEase="expo.out"
                fontSize={54}
                fontWeight={800}
                letterSpacing={0}
              />
              <StrokeText
                className="hero__title-line hero__title-line--brand"
                text={site.headlineBrand}
                strokeColor="var(--accent)"
                fillColor="var(--accent)"
                strokeWidth={1.3}
                drawDuration={1.7}
                fillDelay={0.4}
                stagger={0.06}
                ease="expo.out"
                fillEase="expo.out"
                fontSize={80}
                fontWeight={800}
                letterSpacing={0}
              />
            </div>
          ) : (
            <div className="hero__title-pending" aria-hidden="true">
              <span>{site.headlineLead}</span>
              <strong>{site.headlineBrand}</strong>
            </div>
          )}
          <p className="hero__intro">{site.intro}</p>
        </div>
        <ScrollHint />
      </section>

      <section className="section home-section" aria-labelledby="favorites-title">
        <div className="section-heading">
          <h2 id="favorites-title">收藏与推荐</h2>
        </div>
        {favorites.length ? (
          <div className="favorite-grid">
            {favorites.map((item) => (
              <LiquidSurface className="favorite-tile" key={item.href} cornerRadius={20}>
                <a className="favorite-tile__link" href={item.href} target="_blank" rel="noreferrer">
                  <span className="favorite-tile__domain">{hostOf(item.href)}</span>
                  <strong>{item.name}</strong>
                  <p>{item.description}</p>
                </a>
              </LiquidSurface>
            ))}
          </div>
        ) : (
          <EmptyState icon={Sparkles} title="收藏还在慢慢攒" lead="之后会把常用工具、灵感站点和推荐链接放到这里。" />
        )}
      </section>

    </>
  );
}

function AboutPage() {
  return (
    <>
      <section className="page page-about">
        <PageIntro
          eyebrow="ABOUT"
          title="关于"
          lead="个人主页仍在生长，先记录我常用的模型、设备与日常碎片。"
        />
        <LiquidSurface className="profile-card" cornerRadius={28}>
          <img
            className="profile-card__avatar"
            src={site.avatar}
            alt="沙丁鱼の小窝头像"
            width="400"
            height="400"
          />
          <div className="profile-card__body">
            <h2>{site.name}</h2>
            <p>设备清单、文章与更新记录，之后都会在这里慢慢补全。</p>
          </div>
        </LiquidSurface>

        <section className="about-updates" aria-labelledby="updates-title">
          <div className="about-updates__heading">
            <h2 id="updates-title">更新日志</h2>
            <span>记录每次生长</span>
          </div>
          <LiquidSurface className="update-book-card" cornerRadius={28}>
            <UpdateBook entries={changelog} />
          </LiquidSurface>
        </section>
      </section>
    </>
  );
}

function ArticlesPage({ articleId, onNavigateArticle }) {
  const [articles, setArticles] = useState(null);
  const [pendingArticleId, setPendingArticleId] = useState(null);

  useEffect(() => {
    let alive = true;
    import('./data/articles.js')
      .then((module) => {
        if (alive) setArticles(module.articles);
      })
      .catch(() => {
        if (alive) setArticles([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const active = articles?.find((article) => article.id === articleId);

  const openArticle = (article) => {
    flushSync(() => setPendingArticleId(article.id));
    if (onNavigateArticle) onNavigateArticle(article.id, 'forward');
    else window.location.hash = `#/articles/${encodeURIComponent(article.id)}`;
  };

  const closeArticle = () => {
    if (active) flushSync(() => setPendingArticleId(active.id));
    if (onNavigateArticle) onNavigateArticle(null, 'back');
    else window.location.hash = '#/articles';
  };

  if (active) {
    return <ArticleView article={active} onBack={closeArticle} />;
  }

  return (
    <section className="page">
      <PageIntro eyebrow="ARTICLES" title="文章" lead="记录开发过程、想法和日常折腾。" />
      {articles?.length ? (
          <div className="article-list">
            {articles.map((article) => (
              <LiquidSurface
                className={`article-row-glass ${pendingArticleId === article.id ? 'is-vt-source' : ''}`}
                key={article.id}
                cornerRadius={20}
              >
                <button
                  className="article-row"
                  type="button"
                  onClick={() => openArticle(article)}
                >
                  <span className="article-row__tag">{article.tag}</span>
                  <span className="article-row__title">{article.title}</span>
                  <span className="article-row__summary">{article.summary}</span>
                  <span className="article-row__meta">
                    <span className="article-row__date">{article.date}</span>
                    <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
                  </span>
                </button>
              </LiquidSurface>
            ))}
          </div>
        ) : articles ? (
          <EmptyState icon={FileText} title="还没有文章" lead="第一篇文章发布后会显示在这里。" />
        ) : null}
    </section>
  );
}

function DevicesPage() {
  const categories = ['笔记本', '手机'];
  const grouped = categories.map((category) => ({
    category,
    items: devices.filter((device) => device.category === category),
  }));

  return (
    <>
      <section className="page">
        <PageIntro
          eyebrow="DEVICES"
          title="设备"
          lead="按类别放着目前陪在身边的机器，型号与来源都写了清楚。"
        />
        {grouped.every((group) => !group.items.length) ? (
          <EmptyState icon={Laptop} title="设备清单待补充" lead="填好真实设备后，这里会按使用场景展示。" />
        ) : (
          <div className="device-list">
            {grouped.map((group) =>
              group.items.length ? (
                <section className="device-group" key={group.category} aria-labelledby={`${group.category}-heading`}>
                  <div className="device-group__head">
                    <h2 id={`${group.category}-heading`}>{group.category}</h2>
                    <span>{group.items.length} 台</span>
                  </div>
                  <div className="device-group__grid">
                    {group.items.map((device) => (
                      <LiquidSurface className="device-tile" key={device.id} cornerRadius={20}>
                        <div className="device-tile__media">
                          <img
                            src={device.image}
                            alt={device.name}
                            width={device.width}
                            height={device.height}
                            loading="lazy"
                            decoding="async"
                          />
                          <span className="device-tile__index" aria-hidden="true">
                            {String(devices.indexOf(device) + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="device-tile__body">
                          <div className="device-tile__model">{device.model}</div>
                          <h3>{device.name}</h3>
                          <p className="device-tile__role">{device.role}</p>
                          <div className="device-tile__meta">
                            <span className="device-tile__spec">{device.specs}</span>
                            {device.source ? (
                              <a
                                className="device-tile__source"
                                href={device.source}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`${device.name} 官网`}
                                title={`${device.name} 官网`}
                              >
                                <ExternalLink size={15} strokeWidth={2} aria-hidden="true" />
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </LiquidSurface>
                    ))}
                  </div>
                </section>
              ) : null,
            )}
          </div>
        )}
      </section>
    </>
  );
}

function NotFoundPage() {
  return (
    <section className="page">
      <PageIntro
        eyebrow="404"
        title="页面走丢了"
        lead="这个地址不存在，或者内容已经移动到别处。"
      />
      <EmptyState icon={Sparkles} title="没有找到这个页面" lead="返回首页继续逛逛，或者从顶部导航重新选择。" />
      <a className="not-found__link" href="#/">
        返回首页
      </a>
    </section>
  );
}

function Page({ route, ready, articleId, notFound, onNavigateArticle }) {
  if (notFound) return <NotFoundPage />;
  if (route === 'about') return <MemoAboutPage />;
  if (route === 'articles') {
    return <MemoArticlesPage articleId={articleId} onNavigateArticle={onNavigateArticle} />;
  }
  if (route === 'devices') return <MemoDevicesPage />;
  return <MemoHomePage ready={ready} />;
}

const MemoHomePage = memo(HomePage);
const MemoAboutPage = memo(AboutPage);
const MemoArticlesPage = memo(ArticlesPage);
const MemoDevicesPage = memo(DevicesPage);

export default function App() {
  const { route, articleId, notFound, navigate } = useRoute();
  const pageSwipe = useSwipePages({ route });
  const pageSwipeActive = pageSwipe.swiping;
  const pageSwipeSlot = pageSwipe.swipeSlot;
  useScrollBounce();
  const reduced = usePrefersReducedMotion();
  const fine = useFinePointer();
  const compactNav = useCompactNav();
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('sardine-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [ready, setReady] = useState(false);
  const [backgroundActive, setBackgroundActive] = useState(true);
  const [windowFocused, setWindowFocused] = useState(() => document.hasFocus?.() ?? true);
  const [interacting, setInteracting] = useState(true);
  const interactTimerRef = useRef(null);
  const navTransitionRef = useRef(0);
  const articleTransitionRef = useRef(0);
  const mainRef = useRef(null);
  const hasMountedRef = useRef(false);
  const routeKeys = navItems.map((item) => item.key);
  const routeIndex = routeKeys.indexOf(route);
  const pageSlots = [
    { slot: 'prev', route: routeKeys[routeIndex - 1] },
    { slot: 'current', route },
    { slot: 'next', route: routeKeys[routeIndex + 1] },
  ];
  const swipeRoute = pageSwipeActive && pageSwipeSlot
    ? pageSlots.find(({ slot }) => slot === pageSwipeSlot)?.route
    : null;
  const navVisualKey = swipeRoute || route;

  const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
  const themeTitle = `切换到${THEME_META[nextTheme].label}主题`;

  const navigateTo = (nextRoute) => {
    if (nextRoute === route) return;

    const nextIndex = routeKeys.indexOf(nextRoute);
    if (nextIndex < 0) return;
    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      navigate(nextRoute);
    };

    if (reduced || document.hidden || !document.startViewTransition) {
      commit();
      return;
    }

    const root = document.documentElement;
    const transitionId = ++navTransitionRef.current;
    root.dataset.navDirection = nextIndex > routeIndex ? 'forward' : 'back';
    const transition = document.startViewTransition(() => flushSync(commit));
    const fallbackTimer = window.setTimeout(commit, 120);
    const clearDirection = () => {
      window.clearTimeout(fallbackTimer);
      if (navTransitionRef.current === transitionId) delete root.dataset.navDirection;
    };
    transition.finished.then(clearDirection, clearDirection);
  };

  const navigateArticle = (nextArticleId, direction) => {
    const commit = () => navigate('articles', nextArticleId);
    if (reduced || document.hidden || !document.startViewTransition) {
      commit();
      return;
    }

    const root = document.documentElement;
    const transitionId = ++articleTransitionRef.current;
    root.dataset.articleDirection = direction;
    const transition = document.startViewTransition(() => flushSync(commit));
    const clearDirection = () => {
      if (articleTransitionRef.current === transitionId) delete root.dataset.articleDirection;
    };
    transition.finished.then(clearDirection, clearDirection);
  };

  const handleNavClick = (event, nextRoute) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigateTo(nextRoute);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      hasMountedRef.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) return;
    mainRef.current?.focus({ preventScroll: true });
  }, [route, articleId, notFound]);

  useEffect(() => {
    const wake = () => {
      setInteracting(true);
      clearTimeout(interactTimerRef.current);
      interactTimerRef.current = window.setTimeout(() => setInteracting(false), 1600);
    };
    const events = ['pointermove', 'pointerdown', 'wheel', 'keydown'];
    events.forEach((name) => window.addEventListener(name, wake, { passive: true }));
    return () => {
      events.forEach((name) => window.removeEventListener(name, wake));
      clearTimeout(interactTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onFocus = () => setWindowFocused(true);
    const onBlur = () => setWindowFocused(false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#191436' : '#fff1f6',
    );
    localStorage.setItem('sardine-theme', theme);
  }, [theme]);

  useEffect(() => {
    const delay = reduced ? 0 : 4200;
    const timer = window.setTimeout(() => setReady(true), delay);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  useEffect(() => {
    let resumeTimer;
    const pauseWhileScrolling = () => {
      setBackgroundActive(false);
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => setBackgroundActive(true), 180);
    };
    window.addEventListener('scroll', pauseWhileScrolling, { passive: true });
    window.addEventListener('touchmove', pauseWhileScrolling, { passive: true });
    return () => {
      window.removeEventListener('scroll', pauseWhileScrolling);
      window.removeEventListener('touchmove', pauseWhileScrolling);
      window.clearTimeout(resumeTimer);
    };
  }, []);

  const cycleTheme = (origin) => {
    const index = THEME_CYCLE.indexOf(theme);
    const next = THEME_CYCLE[(index + 1) % THEME_CYCLE.length];
    const root = document.documentElement;

    if (origin && !reduced && document.startViewTransition) {
      root.style.setProperty('--theme-origin-x', `${origin.x}px`);
      root.style.setProperty('--theme-origin-y', `${origin.y}px`);
      const transition = document.startViewTransition(() => {
        root.dataset.theme = next;
        setTheme(next);
      });
      transition.finished.finally(() => {
        root.style.removeProperty('--theme-origin-x');
        root.style.removeProperty('--theme-origin-y');
      });
      return;
    }

    root.dataset.theme = next;
    setTheme(next);
  };

  const topbarInnerRef = useRef(null);
  const desktopNavRef = useRef(null);
  const [pillGeom, setPillGeom] = useState({ x: 0, w: 0 });
  const [pillReady, setPillReady] = useState(false);
  const lastPillGeomRef = useRef({ x: 0, w: 0 });
  const pillBoostTimerRef = useRef(null);

  useLayoutEffect(() => {
    const nav = desktopNavRef.current;
    if (!nav) return undefined;

    const update = () => {
      const active = nav.querySelector('.nav-link.is-active');
      if (!active) return;

      const x = active.offsetLeft;
      const w = active.offsetWidth;
      const changed = lastPillGeomRef.current.x !== x || lastPillGeomRef.current.w !== w;
      lastPillGeomRef.current = { x, w };
      setPillGeom((prev) => (prev.x === x && prev.w === w ? prev : { x, w }));
      if (changed) {
        const pill = nav.querySelector('.desktop-nav__pill');
        if (pill) {
          pill.style.willChange = 'transform, width';
          clearTimeout(pillBoostTimerRef.current);
          pillBoostTimerRef.current = window.setTimeout(() => {
            if (pill.isConnected) pill.style.willChange = 'auto';
          }, 420);
        }
      }
    };

    update();
    const raf = requestAnimationFrame(update);
    document.fonts?.ready?.then(update).catch(() => {});
    window.addEventListener('resize', update);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      clearTimeout(pillBoostTimerRef.current);
    };
  }, [navVisualKey, fine, ready]);

  useEffect(() => {
    requestAnimationFrame(() => setPillReady(true));
  }, []);

  const dockNavRef = useRef(null);
  const [dockGeom, setDockGeom] = useState({ x: 0, w: 0 });
  const [dockReady, setDockReady] = useState(false);
  const lastDockGeomRef = useRef({ x: 0, w: 0 });
  const dockBoostTimerRef = useRef(null);

  useLayoutEffect(() => {
    const dock = dockNavRef.current;
    if (!dock) return undefined;

    const update = () => {
      const active = dock.querySelector('.dock-link.is-active');
      if (!active) return;

      const x = active.offsetLeft;
      const w = active.offsetWidth;
      const changed = lastDockGeomRef.current.x !== x || lastDockGeomRef.current.w !== w;
      lastDockGeomRef.current = { x, w };
      setDockGeom((prev) => (prev.x === x && prev.w === w ? prev : { x, w }));
      if (changed) {
        const glass = dock.querySelector('.dock-glass');
        if (glass) {
          glass.style.willChange = 'transform, width';
          clearTimeout(dockBoostTimerRef.current);
          dockBoostTimerRef.current = window.setTimeout(() => {
            if (glass.isConnected) glass.style.willChange = 'auto';
          }, 400);
        }
      }
    };

    update();
    const raf = requestAnimationFrame(update);
    document.fonts?.ready?.then(update).catch(() => {});
    window.addEventListener('resize', update);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      clearTimeout(dockBoostTimerRef.current);
    };
  }, [navVisualKey, fine, ready]);

  useEffect(() => {
    requestAnimationFrame(() => setDockReady(true));
  }, []);

  useNavMorph({
    compact: compactNav,
    desktopRef: desktopNavRef,
    dockRef: dockNavRef,
    topbarRef: topbarInnerRef,
    reduced,
  });

  useDesktopNavDrag({
    navRef: desktopNavRef,
    activeKey: navVisualKey,
    reduced,
  });

  const background = useMemo(
    () => (
      <FluidBackground
        resolvedTheme={theme}
        reduced={reduced}
        fine={fine}
        focused={windowFocused}
        interacting={interacting}
        running={backgroundActive}
      />
    ),
    [theme, reduced, fine, windowFocused, interacting, backgroundActive],
  );

  return (
    <div className={`app-shell ${ready ? 'is-ready' : 'is-booting'} ${compactNav ? 'is-nav-compact' : ''}`}>
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      {background}
      <GlassDefs />
      <div className="welcome-overlay" aria-hidden={ready}>
        <HelloStroke />
      </div>

      <header className="topbar">
        <div className="topbar__inner container">
          <LiquidSurface className="topbar__brand" cornerRadius={999} surfaceRef={topbarInnerRef}>
            <a className="brand" href="#/" aria-label={site.name}>
              <span>{site.name}</span>
            </a>
          </LiquidSurface>
          <LiquidSurface className="topbar__nav" cornerRadius={999}>
            <nav className="desktop-nav" ref={desktopNavRef} aria-label="主导航">
              <span
                className={`desktop-nav__pill ${pillReady ? '' : 'is-init'}`}
                aria-hidden="true"
                style={{
                  width: `${pillGeom.w}px`,
                  height: '42px',
                  transform: `translateX(${pillGeom.x}px)`,
                  opacity: pillGeom.w ? 1 : 0,
                }}
              />
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.key}
                    className={`nav-link ${!notFound && navVisualKey === item.key ? 'is-active' : ''}`}
                    href={item.href}
                    data-nav={item.key}
                    aria-current={!notFound && navVisualKey === item.key ? 'page' : undefined}
                    onClick={(event) => handleNavClick(event, item.key)}
                  >
                    <Icon size={16} strokeWidth={2.1} aria-hidden="true" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>
          </LiquidSurface>
          <div className="topbar__actions">
            <MusicButton tracks={[playerTrack]} />
            <ThemeButton theme={theme} onCycle={cycleTheme} title={themeTitle} />
          </div>
        </div>
      </header>

      <div className="site-stack">
        <main className="site-main" id="main" ref={mainRef} tabIndex={-1}>
          <div className="page-track">
            {pageSlots.map(({ slot, route: pageRoute }) =>
              pageRoute &&
              (slot === 'current' ||
                (compactNav && pageSwipeActive && pageSwipeSlot === slot)) ? (
                <div
                  key={pageRoute}
                  className={`page-pane container ${slot === 'current' ? 'is-active' : ''}`}
                  data-slot={slot}
                  aria-hidden={slot === 'current' ? undefined : true}
                  inert={slot === 'current' ? undefined : true}
                >
                  <Page
                    route={pageRoute}
                    ready={ready}
                    articleId={pageRoute === route ? articleId : null}
                    notFound={pageRoute === route && notFound}
                    onNavigateArticle={navigateArticle}
                  />
                </div>
              ) : null,
            )}
          </div>
        </main>

        <footer className="site-footer container">
          <GlassIcons className="footer-icons" items={contactItems} />
          <p>{site.name}</p>
        </footer>
      </div>

      <LiquidSurface
        className="mobile-dock"
        cornerRadius={999}
        surfaceRef={dockNavRef}
        role="navigation"
        ariaLabel="移动端导航"
      >
        <span
          className={`dock-glass ${dockReady ? '' : 'is-init'}`}
          aria-hidden="true"
          style={{
            width: `${dockGeom.w}px`,
            height: '44px',
            transform: `translateX(${dockGeom.x}px)`,
            opacity: dockGeom.w ? 1 : 0,
            left: 0,
          }}
        />
        <DockLens active={navVisualKey} items={navItems} reduced={reduced} />
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.key}
              className={`dock-link ${!notFound && navVisualKey === item.key ? 'is-active' : ''}`}
              href={item.href}
              data-nav={item.key}
              aria-label={item.label}
              aria-current={!notFound && navVisualKey === item.key ? 'page' : undefined}
              onClick={(event) => handleNavClick(event, item.key)}
            >
              <Icon size={20} strokeWidth={2} aria-hidden="true" />
              <span className="dock-link__label">{item.label}</span>
            </a>
          );
        })}
      </LiquidSurface>
    </div>
  );
}
