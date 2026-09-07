import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  articles,
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

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}

function useFinePointer() {
  const [fine, setFine] = useState(() => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false);

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFine(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return fine;
}

function useCompactNav() {
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 760px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const update = (event) => setCompact(event.matches);

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => {
        mq.removeEventListener('change', update);
      };
    }

    mq.addListener(update);
    return () => {
      mq.removeListener(update);
    };
  }, []);

  return compact;
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
    return ROUTES.includes(raw) ? raw : 'home';
  };

  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#/');
    const update = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  return route;
}

function useSwipePages({ route }) {
  const pointerRef = useRef(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const main = document.querySelector('.site-main');
    if (!main) return undefined;

    const shouldTrack = () =>
      window.matchMedia?.('(max-width: 760px)').matches ||
      window.matchMedia?.('(pointer: coarse)').matches;

    const onPointerDown = (event) => {
      if (!shouldTrack()) return;
      const target = event.target.closest?.(
        '.mobile-dock, .music-panel, .music-button, .theme-toggle, .update-book',
      );
      if (target) {
        pointerRef.current = null;
        return;
      }
      pointerRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        locked: null,
        direction: null,
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
    };

    const onPointerUp = (event) => {
      const pointer = pointerRef.current;
      pointerRef.current = null;
      if (!pointer || event.pointerId !== pointer.pointerId) return;
      if (pointer.locked !== 'horizontal') return;

      const dx = event.clientX - pointer.x;
      if (Math.abs(dx) < 64) return;
      const direction = dx < 0 ? 'left' : 'right';
      const order = navItems.map((item) => item.key);
      const index = order.indexOf(route);
      if (index < 0) return;
      const nextIndex = direction === 'left' ? index + 1 : index - 1;
      const next = order[nextIndex];
      if (!next) return;
      window.location.hash = `#/${next}`;
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 450);
    };

    const onPointerCancel = () => {
      pointerRef.current = null;
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
    };
  }, [route]);
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

function FluidBackground({ resolvedTheme, reduced, fine, running }) {
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
            maxFPS={lowPower ? 30 : 60}
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
      return (
        <figure className="article__figure">
          <img className="article__img" src={block.src} alt={block.alt} loading="lazy" />
          {block.caption ? <figcaption className="article__caption">{block.caption}</figcaption> : null}
        </figure>
      );
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
      <LiquidSurface className="article__card" cornerRadius={28}>
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
          <img className="profile-card__avatar" src={site.avatar} alt="沙丁鱼の小窝头像" />
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

function ArticlesPage() {
  const [activeId, setActiveId] = useState(null);
  const active = articles.find((article) => article.id === activeId);

  if (active) {
    return <ArticleView article={active} onBack={() => setActiveId(null)} />;
  }

  return (
    <>
      <section className="page">
        <PageIntro
          eyebrow="ARTICLES"
          title="文章"
          lead="记录开发过程、想法和日常折腾。"
        />
        {articles.length ? (
          <div className="article-list">
            {articles.map((article) => (
              <LiquidSurface className="article-row-glass" key={article.id} cornerRadius={20}>
                <button
                  className="article-row"
                  type="button"
                  onClick={() => setActiveId(article.id)}
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
        ) : (
          <EmptyState icon={FileText} title="还没有文章" lead="第一篇文章发布后会显示在这里。" />
        )}
      </section>
    </>
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
                          <img src={device.image} alt={device.name} loading="lazy" />
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

function Page({ route, ready }) {
  if (route === 'about') return <AboutPage />;
  if (route === 'articles') return <ArticlesPage />;
  if (route === 'devices') return <DevicesPage />;
  return <HomePage ready={ready} />;
}

export default function App() {
  const route = useRoute();
  useSwipePages({ route });
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

  const themeTitle = `${THEME_META[theme].label}主题`;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
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

  useLayoutEffect(() => {
    const nav = desktopNavRef.current;
    if (!nav) return undefined;

    const update = () => {
      const active = nav.querySelector('.nav-link.is-active');
      if (!active) return;

      const x = active.offsetLeft;
      const w = active.offsetWidth;
      setPillGeom((prev) => (prev.x === x && prev.w === w ? prev : { x, w }));
    };

    const raf = requestAnimationFrame(update);
    document.fonts?.ready?.then(update).catch(() => {});
    window.addEventListener('resize', update);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
    };
  }, [route, fine, ready]);

  useEffect(() => {
    requestAnimationFrame(() => setPillReady(true));
  }, []);

  const dockNavRef = useRef(null);
  const [dockGeom, setDockGeom] = useState({ x: 0, w: 0 });
  const [dockReady, setDockReady] = useState(false);

  useLayoutEffect(() => {
    const dock = dockNavRef.current;
    if (!dock) return undefined;

    const update = () => {
      const active = dock.querySelector('.dock-link.is-active');
      if (!active) return;

      const x = active.offsetLeft;
      const w = active.offsetWidth;
      setDockGeom((prev) => (prev.x === x && prev.w === w ? prev : { x, w }));
    };

    const raf = requestAnimationFrame(update);
    document.fonts?.ready?.then(update).catch(() => {});
    window.addEventListener('resize', update);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
    };
  }, [route, fine, ready]);

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
    activeKey: route,
    reduced,
  });

  const background = useMemo(
    () => (
      <FluidBackground resolvedTheme={theme} reduced={reduced} fine={fine} running={backgroundActive} />
    ),
    [theme, reduced, fine, backgroundActive],
  );

  return (
    <div className={`app-shell ${ready ? 'is-ready' : 'is-booting'} ${compactNav ? 'is-nav-compact' : ''}`}>
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
                    className={`nav-link ${route === item.key ? 'is-active' : ''}`}
                    href={item.href}
                    data-nav={item.key}
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

      <main className="site-main container" id="main">
        <Page route={route} ready={ready} />
      </main>

      <footer className="site-footer container">
        <GlassIcons className="footer-icons" items={contactItems} />
        <p>{site.name}</p>
      </footer>

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
        <DockLens active={route} items={navItems} reduced={reduced} />
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.key}
              className={`dock-link ${route === item.key ? 'is-active' : ''}`}
              href={item.href}
              data-nav={item.key}
              aria-label={item.label}
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
