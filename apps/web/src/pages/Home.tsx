import './../styles/home.css';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

type ThemeMode = 'light' | 'dark';

type Accent = {
  id: string;
  v: string;
  press: string;
};

type DemoLane = {
  id: 'todo' | 'doing' | 'done';
  title: string;
};

type DemoCard = {
  id: string;
  t: string;
  lane: DemoLane['id'];
  labels: string[];
  avatar?: { c: string; i: string };
};

type DemoCursor = {
  name: string;
  color: string;
};

const ACCENTS: readonly Accent[] = [
  { id: 'green', v: '#0E7C47', press: '#0A6B3C' },
  { id: 'blue', v: '#0079BF', press: '#026AA7' },
  { id: 'orange', v: '#F68B2E', press: '#E8761B' },
  { id: 'burgundy', v: '#8E1C24', press: '#701419' },
  { id: 'plum', v: '#7B5EA7', press: '#634C8A' },
] as const;

const FAQS: ReadonlyArray<readonly [string, string]> = [
  [
    'Is this a real product?',
    'No — Kompflow is a take-home challenge build. The kanban board, real-time sync, and end-to-end encryption are real and working; the marketing-page social proof on this landing is illustrative only.',
  ],
  [
    'How does the encryption work?',
    'Card content is encrypted in your browser with AES-GCM, using a key derived from a per-board passphrase via PBKDF2 (200k iterations). The server stores ciphertext only — it never sees your passphrase or plaintext.',
  ],
  [
    'Does real-time collaboration actually work?',
    'Yes. Card moves and edits broadcast over Pusher channels, so multiple browsers on the same board stay in sync without refresh.',
  ],
  [
    'What features are intentionally not built?',
    "Billing/pricing, mobile apps, multi-region storage, SSO, and a public REST API are out of scope for this build. The pricing section is omitted on purpose — there's no payment system to back it up.",
  ],
  [
    'Can I poke at the code?',
    "Sure — it's a pnpm monorepo: a NestJS + Prisma API and a React + Vite web app. The Tweaks panel (gear button, dev mode only) lets you swap theme, accent, and the hero headline live.",
  ],
];

const HEADLINE_REGEX = /\b(actually|finally|never|just)\b/i;

function HeadlineText({ value }: { value: string }) {
  const match = value.match(HEADLINE_REGEX);
  if (!match || match.index === undefined) return <>{value}</>;
  const before = value.slice(0, match.index);
  const word = match[0];
  const after = value.slice(match.index + word.length);
  return (
    <>
      {before}
      <em>{word}</em>
      {after}
    </>
  );
}

export default function Home() {
  const { user } = useAuth();
  const ctaTarget = user ? '/dashboard' : '/register';
  const ctaLabel = user ? 'Open dashboard' : 'Try free';

  const isDev = import.meta.env.DEV;

  const [tweaksOpen, setTweaksOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [accentIdx, setAccentIdx] = useState<number>(0);
  const [animEnabled, setAnimEnabled] = useState<boolean>(true);
  const [headline, setHeadline] = useState<string>(
    'The kanban your team will actually use.'
  );
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const animEnabledRef = useRef<boolean>(true);
  const boardRef = useRef<HTMLDivElement | null>(null);

  // Load Google Fonts once
  useEffect(() => {
    const id = 'kompflow-fonts';
    if (document.getElementById(id)) return;
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect2);

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&display=swap';
    document.head.appendChild(link);
  }, []);

  // Theme — set on documentElement
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Accent — set CSS custom properties
  useEffect(() => {
    const a = ACCENTS[accentIdx];
    document.documentElement.style.setProperty('--accent', a.v);
    document.documentElement.style.setProperty('--accent-press', a.press);
    document.documentElement.style.setProperty(
      '--accent-soft',
      `color-mix(in srgb, ${a.v} 15%, white)`
    );
  }, [accentIdx]);

  // Keep ref in sync with animEnabled state for the imperative loop
  useEffect(() => {
    animEnabledRef.current = animEnabled;
  }, [animEnabled]);

  // Animated mini-board
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const lanes: DemoLane[] = [
      { id: 'todo', title: 'To Do' },
      { id: 'doing', title: 'In Progress' },
      { id: 'done', title: 'Done' },
    ];
    const cards: DemoCard[] = [
      { id: 'c1', t: 'Hero & landing copy', lane: 'todo', labels: ['#F68B2E', '#61BD4F'], avatar: { c: '#0079BF', i: 'YO' } },
      { id: 'c2', t: 'Wire up event tracking', lane: 'todo', labels: ['#EB5A46'], avatar: { c: '#61BD4F', i: 'DP' } },
      { id: 'c3', t: 'Pricing page copy', lane: 'todo', labels: ['#F68B2E'], avatar: { c: '#0079BF', i: 'YO' } },
      { id: 'c4', t: 'Lifecycle email sequence', lane: 'todo', labels: ['#61BD4F'] },
      { id: 'c5', t: 'Onboarding flow v3', lane: 'doing', labels: ['#0079BF', '#00C2E0'], avatar: { c: '#61BD4F', i: 'DP' } },
      { id: 'c6', t: 'Logo & brand mark', lane: 'doing', labels: ['#FF78CB', '#C377E0'], avatar: { c: '#C377E0', i: 'LZ' } },
      { id: 'c7', t: 'User research — round 2', lane: 'doing', labels: ['#0079BF', '#C377E0'], avatar: { c: '#EB5A46', i: 'MS' } },
      { id: 'c8', t: 'Project kickoff', lane: 'done', labels: ['#61BD4F'] },
      { id: 'c9', t: 'Creative brief signed off', lane: 'done', labels: ['#61BD4F', '#51E898'] },
      { id: 'c10', t: 'Define Q3 OKRs', lane: 'done', labels: ['#61BD4F'] },
    ];

    const cursors: DemoCursor[] = [
      { name: 'Maya', color: '#EB5A46' },
      { name: 'Devon', color: '#61BD4F' },
    ];
    const cursorEls: Record<string, HTMLDivElement> = {};

    function escapeHtml(s: string): string {
      return s.replace(/[&<>"']/g, (c) => {
        switch (c) {
          case '&': return '&amp;';
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '"': return '&quot;';
          case "'": return '&#39;';
          default: return c;
        }
      });
    }

    function addCursors(): void {
      if (!board) return;
      cursors.forEach((c) => {
        const el = document.createElement('div');
        el.className = 'demo-cursor';
        el.style.color = c.color;
        el.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3l7 18 2-7 7-2z"/></svg>
          <div class="demo-cursor-name">${escapeHtml(c.name)}</div>
        `;
        el.style.left = '50%';
        el.style.top = '50%';
        board.appendChild(el);
        cursorEls[c.name] = el;
      });
    }

    function render(): void {
      if (!board) return;
      board.innerHTML = '';
      lanes.forEach((l) => {
        const laneEl = document.createElement('div');
        laneEl.className = 'demo-lane';
        laneEl.dataset.lane = l.id;
        const count = cards.filter((c) => c.lane === l.id).length;
        laneEl.innerHTML = `<div class="demo-lane-title">${l.title}<span class="demo-lane-count">${count}</span></div>`;
        cards
          .filter((c) => c.lane === l.id)
          .forEach((c) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'demo-card';
            cardEl.dataset.id = c.id;
            const labelsHtml = (c.labels || [])
              .map((co) => `<div class="label" style="background:${co}"></div>`)
              .join('');
            const avatarHtml = c.avatar
              ? `<div class="meta"><div class="avatar" style="background:${c.avatar.c}">${escapeHtml(c.avatar.i)}</div></div>`
              : '';
            cardEl.innerHTML = `
              <div class="label-row">${labelsHtml}</div>
              ${escapeHtml(c.t)}
              ${avatarHtml}
            `;
            laneEl.appendChild(cardEl);
          });
        board.appendChild(laneEl);
      });
      // Wipe cursor refs since they were children of the cleared board
      for (const k of Object.keys(cursorEls)) delete cursorEls[k];
      addCursors();
    }

    function moveCursors(): void {
      if (!animEnabledRef.current || !board) return;
      Object.values(cursorEls).forEach((el) => {
        const x = 20 + Math.random() * (board.clientWidth - 60);
        const y = 50 + Math.random() * (board.clientHeight - 100);
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
    }

    function moveOne(): void {
      if (!animEnabledRef.current || !board) return;
      const order: DemoLane['id'][] = ['todo', 'doing', 'done'];
      const candidates = cards.filter((c) => c.lane !== 'done');
      if (candidates.length === 0) {
        cards.forEach((c, i) => {
          c.lane = i < 4 ? 'todo' : i < 7 ? 'doing' : 'done';
        });
        render();
        return;
      }
      const card = candidates[Math.floor(Math.random() * candidates.length)];
      const cardEl = board.querySelector<HTMLDivElement>(`[data-id="${card.id}"]`);
      if (!cardEl) return;
      const nextIdx = order.indexOf(card.lane) + 1;
      const nextLane = order[nextIdx];
      if (!nextLane) return;
      const targetLaneEl = board.querySelector<HTMLDivElement>(`[data-lane="${nextLane}"]`);
      if (!targetLaneEl) return;

      const boardRect = board.getBoundingClientRect();
      const startRect = cardEl.getBoundingClientRect();
      const endLaneRect = targetLaneEl.getBoundingClientRect();
      const existingCards = targetLaneEl.querySelectorAll('.demo-card');
      const endY =
        endLaneRect.top - boardRect.top + 40 + existingCards.length * 56;

      const ghost = cardEl.cloneNode(true) as HTMLDivElement;
      ghost.classList.add('flying');
      ghost.style.left = `${startRect.left - boardRect.left}px`;
      ghost.style.top = `${startRect.top - boardRect.top}px`;
      ghost.style.width = `${startRect.width}px`;
      board.appendChild(ghost);
      cardEl.style.opacity = '0';

      requestAnimationFrame(() => {
        ghost.style.transform = `translate(${endLaneRect.left - startRect.left}px, ${endY - (startRect.top - boardRect.top)}px) rotate(2deg)`;
      });

      window.setTimeout(() => {
        card.lane = nextLane;
        ghost.remove();
        render();
      }, 700);
    }

    render();
    const cursorInitTimer = window.setTimeout(moveCursors, 100);
    const cursorInterval = window.setInterval(moveCursors, 2200);
    const moveInitTimer = window.setTimeout(moveOne, 1800);
    const moveInterval = window.setInterval(moveOne, 3500);

    return () => {
      window.clearTimeout(cursorInitTimer);
      window.clearInterval(cursorInterval);
      window.clearTimeout(moveInitTimer);
      window.clearInterval(moveInterval);
      if (board) board.innerHTML = '';
    };
  }, []);

  // Reveal-on-scroll IntersectionObserver
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* ============= NAV ============= */}
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="logo">
            <div className="logo-mark">K</div>
            Kompflow
          </Link>
          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#showcase">Product</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="nav-spacer"></div>
          <div className="nav-cta">
            {!user && (
              <Link to="/login" className="btn btn-ghost">Sign in</Link>
            )}
            <Link to={ctaTarget} className="btn btn-primary">{ctaLabel}</Link>
          </div>
        </div>
      </header>

      {/* ============= HERO ============= */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-text">
            <div className="eyebrow"><span className="eyebrow-dot"></span> Real-time · End-to-end encrypted</div>
            <h1 className="hero-title" id="headline">
              <HeadlineText value={headline} />
            </h1>
            <p className="hero-sub">A kanban board with live multi-cursor sync over Pusher and per-board AES-GCM encryption that runs in your browser.</p>
            <div className="hero-cta">
              <Link to={ctaTarget} className="btn btn-primary btn-lg">
                Try the demo
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </Link>
              <a href="#showcase" className="btn btn-outline btn-lg">See it in action</a>
            </div>
            <div className="hero-meta">
              <span className="hero-meta-dot"></span>
              No sign-up required to browse · Source on request
            </div>
          </div>
          <div
            className="demo-board"
            id="demo"
            ref={boardRef}
            role="img"
            aria-label="Animated illustration of a kanban board with cards moving between lanes"
          >
            {/* populated by effect — decorative */}
          </div>
        </div>
      </section>

      {/* ============= FEATURES ============= */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">What's actually built</div>
            <h2 className="section-title">The parts that work.<br />Nothing that doesn't.</h2>
            <p className="section-sub">Lanes, cards, drag-and-drop, live sync between browsers, and per-board encryption. That's the build.</p>
          </div>
          <div className="features">

            {/* Featured: real-time */}
            <div className="feature featured reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 0110 10M12 22a10 10 0 01-10-10M22 12a10 10 0 01-10 10M2 12A10 10 0 0112 2"/></svg>
              </div>
              <div className="feature-eyebrow">Live sync</div>
              <h3 className="feature-title">Cards update across every open tab</h3>
              <p className="feature-desc">Card creates, moves, and edits broadcast over Pusher channels scoped to each board. Open the same board in two browsers — they stay in lockstep without refresh.</p>
              <div className="feature-mini-art" aria-hidden="true" style={{ background: 'rgba(255,255,255,0.12)', justifyContent: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#F68B2E', border: '2px solid white', marginRight: -6 }}></div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#C377E0', border: '2px solid white', marginRight: -6 }}></div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0079BF', border: '2px solid white' }}></div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Example presence indicator</div>
              </div>
            </div>

            {/* Drag & drop */}
            <div className="feature reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
              </div>
              <div className="feature-eyebrow">Drag & drop</div>
              <h3 className="feature-title">Movement that feels right</h3>
              <p className="feature-desc">Springy, weighted animations on every drop. The card lands where you let go.</p>
              <div className="feature-mini-art" aria-hidden="true">
                <div className="mini-card"></div>
                <div className="mini-card" style={{ opacity: 0.5 }}></div>
                <div className="mini-card" style={{ opacity: 0.3 }}></div>
              </div>
            </div>

            {/* Encryption */}
            <div className="feature reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
              </div>
              <div className="feature-eyebrow">Per-board encryption</div>
              <h3 className="feature-title">Card content encrypted in your browser</h3>
              <p className="feature-desc">AES-GCM encryption with a key derived from a per-board passphrase via PBKDF2 (200k iterations). The server only stores ciphertext.</p>
              <div className="feature-mini-art" aria-hidden="true" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--fg-3)', justifyContent: 'center' }}>
                AES-GCM · PBKDF2-SHA256
              </div>
            </div>

            {/* Markdown */}
            <div className="feature reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/></svg>
              </div>
              <div className="feature-eyebrow">Rich cards</div>
              <h3 className="feature-title">Markdown that looks like Markdown</h3>
              <p className="feature-desc">Headings, lists, links, code, checkboxes. Write fast, render gracefully.</p>
              <div className="feature-mini-art" aria-hidden="true" style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-start', padding: '8px 12px' }}>
                <div style={{ height: 6, width: '60%', background: 'var(--ink)', borderRadius: 2 }}></div>
                <div style={{ height: 4, width: '80%', background: 'var(--fg-3)', borderRadius: 2, opacity: 0.5 }}></div>
                <div style={{ height: 4, width: '70%', background: 'var(--fg-3)', borderRadius: 2, opacity: 0.5 }}></div>
              </div>
            </div>

            {/* Dark mode */}
            <div className="feature reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
              </div>
              <div className="feature-eyebrow">Settings</div>
              <h3 className="feature-title">Light, dark, and accent colors</h3>
              <p className="feature-desc">Match your environment. Five accent colors, light and dark themes — try them via the gear icon.</p>
              <div className="feature-mini-art" aria-hidden="true" style={{ background: 'linear-gradient(90deg, white 50%, #14130F 50%)', padding: 0 }}>
                <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1C1A16' }}>Light</div>
                <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#F4F1E8' }}>Dark</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============= SHOWCASE ============= */}
      <section className="showcase" id="showcase">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">A closer look</div>
            <h2 className="section-title">An example board.</h2>
            <p className="section-sub">A stylized illustration of the board view — log in to interact with the real one.</p>
          </div>
          <div className="showcase-frame reveal">
            <div className="showcase-bar">
              <span className="dot r"></span><span className="dot y"></span><span className="dot g"></span>
              <span className="showcase-url">app.kompflow.local/b/q3-launch</span>
            </div>
            <div className="showcase-board">
              <div className="showcase-lane">
                <div className="showcase-lane-title">Backlog <span className="demo-lane-count">3</span></div>
                <div className="s-card">
                  <div className="labels"><div className="label" style={{ background: '#0079BF' }}></div><div className="label" style={{ background: '#C377E0' }}></div></div>
                  User research interviews — round 2
                  <div className="meta">
                    <span className="due">📅 May 3</span>
                    <div className="avatar-row">
                      <div className="avatar" style={{ background: '#EB5A46' }}>MS</div>
                      <div className="avatar" style={{ background: '#C377E0' }}>LZ</div>
                    </div>
                  </div>
                </div>
                <div className="s-card">
                  <div className="labels"><div className="label" style={{ background: '#C377E0' }}></div></div>
                  Update buyer personas
                </div>
                <div className="s-card">
                  <div className="labels"><div className="label" style={{ background: '#0079BF' }}></div></div>
                  Competitive teardown: 3 closest tools
                </div>
              </div>

              <div className="showcase-lane">
                <div className="showcase-lane-title">In Progress <span className="demo-lane-count">2</span></div>
                <div className="s-card" style={{ borderTop: '4px solid #F68B2E' }}>
                  <div className="labels"><div className="label" style={{ background: '#F68B2E' }}></div><div className="label" style={{ background: '#61BD4F' }}></div></div>
                  Marketing site — hero section
                  <div className="meta">
                    <span className="due overdue">📅 Tomorrow</span>
                    <div className="avatar-row">
                      <div className="avatar" style={{ background: '#61BD4F' }}>DP</div>
                      <div className="avatar" style={{ background: '#0079BF' }}>YO</div>
                    </div>
                  </div>
                </div>
                <div className="s-card">
                  <div className="labels"><div className="label" style={{ background: '#0079BF' }}></div><div className="label" style={{ background: '#00C2E0' }}></div></div>
                  Onboarding flow v3
                  <div className="meta">
                    <span className="due overdue">📅 Today</span>
                    <div className="avatar-row">
                      <div className="avatar" style={{ background: '#61BD4F' }}>DP</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="showcase-lane">
                <div className="showcase-lane-title">In Review <span className="demo-lane-count">2</span></div>
                <div className="s-card" style={{ borderTop: '4px solid #C377E0' }}>
                  <div className="labels"><div className="label" style={{ background: '#FF78CB' }}></div><div className="label" style={{ background: '#C377E0' }}></div></div>
                  Logo & brand mark — final round
                  <div className="meta">
                    <span className="due">📅 May 1</span>
                    <div className="avatar-row">
                      <div className="avatar" style={{ background: '#C377E0' }}>LZ</div>
                    </div>
                  </div>
                </div>
                <div className="s-card">
                  <div className="labels"><div className="label" style={{ background: '#EB5A46' }}></div></div>
                  Wire up event tracking
                </div>
              </div>

              <div className="showcase-lane">
                <div className="showcase-lane-title">Done <span className="demo-lane-count">2</span></div>
                <div className="s-card">
                  <div className="labels"><div className="label" style={{ background: '#61BD4F' }}></div></div>
                  <span style={{ textDecoration: 'line-through', color: 'var(--fg-3)' }}>Project kickoff with leadership</span>
                </div>
                <div className="s-card">
                  <div className="labels"><div className="label" style={{ background: '#61BD4F' }}></div><div className="label" style={{ background: '#51E898' }}></div></div>
                  <span style={{ textDecoration: 'line-through', color: 'var(--fg-3)' }}>Creative brief signed off</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============= FAQ ============= */}
      <section className="section" id="faq" style={{ paddingTop: 40 }}>
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">Questions</div>
            <h2 className="section-title">Quick answers</h2>
          </div>
          <div className="faq" id="faq-list">
            {FAQS.map(([q, a], i) => {
              const isOpen = openFaqIdx === i;
              return (
                <div key={q} className={`faq-item${isOpen ? ' open' : ''}`}>
                  <button
                    className="faq-q"
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIdx(isOpen ? null : i)}
                  >
                    {q}
                    <svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  <div className="faq-a">{a}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============= FINAL CTA ============= */}
      <section style={{ paddingBottom: 40 }}>
        <div className="final-cta reveal">
          <div className="final-cta-inner">
            <h2 className="final-cta-title">Ready to move some cards?</h2>
            <p className="final-cta-sub">Sign up takes a few seconds. Open two tabs to watch live sync work.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to={ctaTarget} className="btn btn-primary btn-lg">
                {user ? 'Open dashboard' : 'Try free'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </Link>
              <a href="#showcase" className="btn btn-ghost btn-lg">See the example board</a>
            </div>
          </div>
        </div>
      </section>

      {/* ============= FOOTER ============= */}
      <footer className="footer">
        <div className="container">
          <div className="footer-bottom" style={{ paddingTop: 24 }}>
            <Link to="/" className="logo">
              <div className="logo-mark">K</div>
              Kompflow
            </Link>
            <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>
              A kanban take-home challenge. © {new Date().getFullYear()}.
            </span>
          </div>
        </div>
      </footer>

      {/* ============= TWEAKS (DEV ONLY) ============= */}
      {isDev && (
        <>
          <button
            className="tweaks-fab"
            id="tweaks-toggle"
            aria-label="Tweaks (dev only)"
            type="button"
            onClick={() => setTweaksOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>
          </button>
          {tweaksOpen && (
            <div className="tweaks-panel" id="tweaks-panel" role="dialog" aria-label="Tweaks">
              <div className="tweaks-title">
                Tweaks
                <button
                  type="button"
                  aria-label="Close tweaks"
                  onClick={() => setTweaksOpen(false)}
                  style={{ color: 'var(--fg-3)', fontSize: 18 }}
                >×</button>
              </div>
              <div className="tweaks-section">
                <div className="tweaks-row">
                  <span className="tweaks-label">Theme</span>
                  <div className="tweaks-segment" id="theme-seg">
                    <button
                      type="button"
                      className={theme === 'light' ? 'active' : ''}
                      onClick={() => setTheme('light')}
                    >Light</button>
                    <button
                      type="button"
                      className={theme === 'dark' ? 'active' : ''}
                      onClick={() => setTheme('dark')}
                    >Dark</button>
                  </div>
                </div>
                <div className="tweaks-row">
                  <span className="tweaks-label">Accent</span>
                  <div className="tweaks-swatches" id="accent-swatches">
                    {ACCENTS.map((a, i) => (
                      <button
                        key={a.id}
                        type="button"
                        className={`tweaks-swatch${i === accentIdx ? ' active' : ''}`}
                        style={{ background: a.v }}
                        title={a.id}
                        aria-label={`Accent ${a.id}`}
                        onClick={() => setAccentIdx(i)}
                      />
                    ))}
                  </div>
                </div>
                <div className="tweaks-row">
                  <span className="tweaks-label">Animated demo</span>
                  <div className="tweaks-segment" id="anim-seg">
                    <button
                      type="button"
                      className={animEnabled ? 'active' : ''}
                      onClick={() => setAnimEnabled(true)}
                    >On</button>
                    <button
                      type="button"
                      className={!animEnabled ? 'active' : ''}
                      onClick={() => setAnimEnabled(false)}
                    >Off</button>
                  </div>
                </div>
              </div>
              <div className="tweaks-section">
                <label className="tweaks-label" htmlFor="headline-input" style={{ marginBottom: 6, display: 'block' }}>Headline</label>
                <input
                  id="headline-input"
                  className="tweaks-input"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
