import './../styles/home.css';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

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
    'Is there really a free plan?',
    "Yes — free for up to 10 users, with unlimited boards and cards. We don't expire it or hide features behind a popup.",
  ],
  [
    'How is Kompflow different from Trello or Linear?',
    "We sit between them. You get the visual simplicity of a kanban board with grown-up features: end-to-end encryption, a real API, and an interface that doesn't feel like 2014.",
  ],
  [
    'Can I import from another tool?',
    'Yes. We support CSV, Trello JSON exports, Asana, and a generic JSON format documented in our API.',
  ],
  [
    'Where is my data stored?',
    "In AWS regions you choose: US, EU, or APAC. With Pro and above, card content is encrypted with keys we can't access.",
  ],
  [
    'Do you have a mobile app?',
    'The web app is fully responsive. Native iOS and Android are in beta — drop us your email in the footer to join.',
  ],
  [
    'What happens if I cancel?',
    "You keep read-only access forever. Export your data anytime as JSON or CSV. We don't hold your work hostage.",
  ],
];

const HEADLINE_REGEX = /\b(actually|finally|never|just)\b/i;

function renderHeadlineHtml(value: string): string {
  return value.replace(HEADLINE_REGEX, '<em>$1</em>');
}

export default function Home() {
  const [tweaksOpen, setTweaksOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [accentIdx, setAccentIdx] = useState<number>(0);
  const [animEnabled, setAnimEnabled] = useState<boolean>(true);
  const [headline, setHeadline] = useState<string>(
    'The kanban your team will actually use.'
  );
  const [openFaqIdx, setOpenFaqIdx] = useState<number>(0);

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
          <a href="#" className="logo">
            <div className="logo-mark">B</div>
            Kompflow
          </a>
          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#showcase">Product</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="nav-spacer"></div>
          <div className="nav-cta">
            <Link to="/login" className="btn btn-ghost">Sign in</Link>
            <Link to="/register" className="btn btn-primary">Try free</Link>
          </div>
        </div>
      </header>

      {/* ============= HERO ============= */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-text">
            <div className="eyebrow"><span className="eyebrow-dot"></span> New · Real-time collaboration</div>
            <h1
              className="hero-title"
              id="headline"
              dangerouslySetInnerHTML={{ __html: renderHeadlineHtml(headline) }}
            />
            <p className="hero-sub">Kompflow is a beautifully simple project board with real-time sync, end-to-end encrypted cards, and the kind of micro-interactions that make work feel less like work.</p>
            <div className="hero-cta">
              <Link to="/register" className="btn btn-primary btn-lg">
                Start free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </Link>
              <a href="#showcase" className="btn btn-outline btn-lg">See it in action</a>
            </div>
            <div className="hero-meta">
              <span className="hero-meta-dot"></span>
              Free for up to 10 users · No credit card required
            </div>
          </div>
          <div className="demo-board" id="demo" ref={boardRef}>
            {/* populated by effect */}
          </div>
        </div>
      </section>

      {/* ============= LOGOS ============= */}
      <section className="logos">
        <div className="container">
          <div className="logos-label">Trusted by teams at companies that ship</div>
          <div className="logos-row">
            <div className="logo-item"><span className="glyph">N</span> Northwind</div>
            <div className="logo-item"><span className="glyph">A</span> Acme Co</div>
            <div className="logo-item"><span className="glyph">G</span> Globex</div>
            <div className="logo-item"><span className="glyph">S</span> Soylent</div>
            <div className="logo-item"><span className="glyph">H</span> Hooli</div>
            <div className="logo-item"><span className="glyph">P</span> Pied Piper</div>
          </div>
        </div>
      </section>

      {/* ============= FEATURES ============= */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">Features</div>
            <h2 className="section-title">Everything you'd expect.<br />Nothing you wouldn't.</h2>
            <p className="section-sub">A board, lanes, cards, drag and drop. Plus the small stuff that makes a difference at 4pm on a Friday.</p>
          </div>
          <div className="features">

            {/* Featured: real-time */}
            <div className="feature featured reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 0110 10M12 22a10 10 0 01-10-10M22 12a10 10 0 01-10 10M2 12A10 10 0 0112 2"/></svg>
              </div>
              <div className="feature-eyebrow">Live sync</div>
              <h3 className="feature-title">See teammates move cards in real time</h3>
              <p className="feature-desc">Live cursors, presence avatars, and instant updates. No refresh, no merge conflicts — just watch the board update as your team works.</p>
              <div className="feature-mini-art" style={{ background: 'rgba(255,255,255,0.12)', justifyContent: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', gap: '-6px' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#F68B2E', border: '2px solid white', marginRight: -6 }}></div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#C377E0', border: '2px solid white', marginRight: -6 }}></div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0079BF', border: '2px solid white' }}></div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>3 teammates online</div>
                <div style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#51E898' }}></span> connected
                </div>
              </div>
            </div>

            {/* Drag & drop */}
            <div className="feature reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
              </div>
              <div className="feature-eyebrow">Drag & drop</div>
              <h3 className="feature-title">Movement that feels right</h3>
              <p className="feature-desc">Springy, weighted animations on every drop. The card lands where you let go.</p>
              <div className="feature-mini-art">
                <div className="mini-card"></div>
                <div className="mini-card" style={{ opacity: 0.5 }}></div>
                <div className="mini-card" style={{ opacity: 0.3 }}></div>
              </div>
            </div>

            {/* Encryption */}
            <div className="feature reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
              </div>
              <div className="feature-eyebrow">End-to-end encryption</div>
              <h3 className="feature-title">Cards only your team can read</h3>
              <p className="feature-desc">Encrypted at rest and in transit. We can't see your cards. Neither can anyone else.</p>
              <div className="feature-mini-art" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--fg-3)', justifyContent: 'center' }}>
                a3f1·9c2e·b817·4d05
              </div>
            </div>

            {/* Markdown */}
            <div className="feature reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/></svg>
              </div>
              <div className="feature-eyebrow">Rich cards</div>
              <h3 className="feature-title">Markdown that looks like Markdown</h3>
              <p className="feature-desc">Headings, lists, links, code, images, checkboxes. Write fast, render gracefully.</p>
              <div className="feature-mini-art" style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-start', padding: '8px 12px' }}>
                <div style={{ height: 6, width: '60%', background: 'var(--ink)', borderRadius: 2 }}></div>
                <div style={{ height: 4, width: '80%', background: 'var(--fg-3)', borderRadius: 2, opacity: 0.5 }}></div>
                <div style={{ height: 4, width: '70%', background: 'var(--fg-3)', borderRadius: 2, opacity: 0.5 }}></div>
              </div>
            </div>

            {/* Dark mode */}
            <div className="feature reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
              </div>
              <div className="feature-eyebrow">Settings</div>
              <h3 className="feature-title">Dark mode, density, motion</h3>
              <p className="feature-desc">Match your environment. Compact for power users, cozy for fresh eyes.</p>
              <div className="feature-mini-art" style={{ background: 'linear-gradient(90deg, white 50%, #14130F 50%)', padding: 0 }}>
                <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1C1A16' }}>Light</div>
                <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#F4F1E8' }}>Dark</div>
              </div>
            </div>

            {/* API */}
            <div className="feature reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              </div>
              <div className="feature-eyebrow">Developer API</div>
              <h3 className="feature-title">Full REST API + OpenAPI schema</h3>
              <p className="feature-desc">Wire Kompflow into your stack. Webhooks, CRUD, JSON exports.</p>
              <div className="feature-mini-art" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--accent)', justifyContent: 'flex-start' }}>
                GET&nbsp;<span style={{ color: 'var(--fg-2)' }}>/api/boards/:id</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============= STATS ============= */}
      <section>
        <div className="container">
          <div className="stats reveal">
            <div className="stat">
              <div className="stat-num"><span>40k+</span></div>
              <div className="stat-label">Teams using Kompflow</div>
            </div>
            <div className="stat">
              <div className="stat-num"><span>2M+</span></div>
              <div className="stat-label">Cards moved this week</div>
            </div>
            <div className="stat">
              <div className="stat-num"><span>99.99%</span></div>
              <div className="stat-label">Uptime, last 12 months</div>
            </div>
            <div className="stat">
              <div className="stat-num"><span>4.9</span></div>
              <div className="stat-label">★ on Product Hunt</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============= SHOWCASE ============= */}
      <section className="showcase" id="showcase">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">A closer look</div>
            <h2 className="section-title">Made for the work,<br />not the meeting about the work.</h2>
            <p className="section-sub">A real board with real cards, real labels, and a real screenshot — not a stylized illustration.</p>
          </div>
          <div className="showcase-frame reveal">
            <div className="showcase-bar">
              <span className="dot r"></span><span className="dot y"></span><span className="dot g"></span>
              <span className="showcase-url">app.boardflow.com/b/q3-launch</span>
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

      {/* ============= TESTIMONIALS ============= */}
      <section className="section">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">Why teams switch</div>
            <h2 className="section-title">Loved by people who hate project management tools.</h2>
          </div>
          <div className="testimonials">
            <div className="testimonial reveal">
              <p className="testimonial-quote">We replaced three tools with one. The team noticed within a week — fewer meetings, fewer dropped balls.</p>
              <div className="testimonial-meta">
                <div className="testimonial-avatar" style={{ background: '#0E7C47' }}>RA</div>
                <div>
                  <div className="testimonial-name">Rosa Alvarez</div>
                  <div className="testimonial-role">Head of Product, Northwind</div>
                </div>
              </div>
            </div>
            <div className="testimonial reveal">
              <p className="testimonial-quote">The encryption story is what got us through legal. The drag-and-drop feel is what got the team on board.</p>
              <div className="testimonial-meta">
                <div className="testimonial-avatar" style={{ background: '#8E1C24' }}>JH</div>
                <div>
                  <div className="testimonial-name">Jamal Henderson</div>
                  <div className="testimonial-role">CTO, Soylent Health</div>
                </div>
              </div>
            </div>
            <div className="testimonial reveal">
              <p className="testimonial-quote">It feels like Trello if Trello had been redesigned in 2026 and someone actually used it before shipping.</p>
              <div className="testimonial-meta">
                <div className="testimonial-avatar" style={{ background: '#F68B2E' }}>PT</div>
                <div>
                  <div className="testimonial-name">Priya Tandon</div>
                  <div className="testimonial-role">Engineering Manager, Pied Piper</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============= PRICING ============= */}
      <section className="section" id="pricing">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">Pricing</div>
            <h2 className="section-title">Simple plans.<br />Fair prices.</h2>
            <p className="section-sub">Start free. Upgrade when your team outgrows it. Cancel anytime, no calls.</p>
          </div>
          <div className="pricing">
            <div className="price-card reveal">
              <div className="price-name">Free</div>
              <div className="price-amount"><span className="currency">$</span>0<span className="per"> /forever</span></div>
              <div className="price-desc">For solo work and small teams getting started.</div>
              <ul className="price-features">
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> Up to 10 users</li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> Unlimited boards & cards</li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> Real-time sync</li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> Markdown cards</li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> Dark mode</li>
              </ul>
              <div className="price-cta">
                <Link to="/register" className="btn btn-outline">Start free</Link>
              </div>
            </div>

            <div className="price-card featured reveal">
              <div className="price-name">Pro</div>
              <div className="price-amount"><span className="currency">$</span>9<span className="per"> /user/mo</span></div>
              <div className="price-desc">For teams that want the polish, not the friction.</div>
              <ul className="price-features">
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> Everything in Free</li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> Unlimited users</li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> End-to-end encryption</li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> REST API & webhooks</li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> Priority support</li>
              </ul>
              <div className="price-cta">
                <Link to="/register" className="btn btn-primary">Try Pro free for 14 days</Link>
              </div>
            </div>

            <div className="price-card reveal">
              <div className="price-name">Enterprise</div>
              <div className="price-amount" style={{ fontSize: 36, paddingTop: 6 }}>Let's talk</div>
              <div className="price-desc">For larger organizations with security & compliance needs.</div>
              <ul className="price-features">
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> Everything in Pro</li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> SSO + SCIM</li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> SOC 2 Type II</li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> Dedicated CSM</li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg> Custom contracts</li>
              </ul>
              <div className="price-cta">
                <a href="mailto:sales@kompflow.com" className="btn btn-outline">Contact sales</a>
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
                    onClick={() => setOpenFaqIdx(isOpen ? -1 : i)}
                  >
                    {q}
                    <svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 12 15 18 9"/></svg>
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
            <p className="final-cta-sub">Free for up to 10 users. No credit card. No sales call. Just sign up.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary btn-lg">
                Start free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </Link>
              <a href="#showcase" className="btn btn-ghost btn-lg">Watch the demo</a>
            </div>
          </div>
        </div>
      </section>

      {/* ============= FOOTER ============= */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#" className="logo">
                <div className="logo-mark">B</div>
                Kompflow
              </a>
              <p className="footer-tagline">A beautifully simple kanban board for teams that ship. Made with care since 2024.</p>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#showcase">Changelog</a></li>
                <li><a href="#">API docs</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Company</div>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Legal</div>
              <ul>
                <li><a href="#">Privacy</a></li>
                <li><a href="#">Terms</a></li>
                <li><a href="#">Security</a></li>
                <li><a href="#">DPA</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Kompflow, Inc. Made in San Francisco.</span>
            <div className="footer-socials">
              <a href="#" aria-label="Twitter"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.8c-.7.3-1.5.5-2.4.6.9-.5 1.5-1.4 1.8-2.4-.8.5-1.7.8-2.7 1-.8-.8-1.9-1.4-3.1-1.4-2.4 0-4.3 1.9-4.3 4.3 0 .3 0 .7.1 1C7.7 8.7 4.6 7 2.5 4.5c-.4.6-.6 1.4-.6 2.2 0 1.5.8 2.8 1.9 3.6-.7 0-1.4-.2-2-.5v.1c0 2.1 1.5 3.8 3.5 4.2-.4.1-.7.2-1.1.2-.3 0-.5 0-.8-.1.5 1.7 2.1 3 4 3-1.5 1.1-3.3 1.8-5.3 1.8H2c1.9 1.2 4.1 1.9 6.5 1.9 7.8 0 12-6.5 12-12.1v-.6c.8-.6 1.5-1.4 2.1-2.3z"/></svg></a>
              <a href="#" aria-label="GitHub"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.8 9.6.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.6-1.4-2.2-.3-4.5-1.1-4.5-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1 .8-.2 1.6-.3 2.5-.3.8 0 1.7.1 2.5.3 1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.5 5 .4.3.7.9.7 1.8v2.6c0 .3.2.6.7.5C19.1 20.5 22 16.7 22 12.2 22 6.6 17.5 2 12 2z"/></svg></a>
              <a href="#" aria-label="LinkedIn"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM8.3 18H5.7V9.7h2.6V18zM7 8.5c-.8 0-1.5-.7-1.5-1.5S6.2 5.5 7 5.5s1.5.7 1.5 1.5S7.8 8.5 7 8.5zM18.3 18h-2.6v-4c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2V18h-2.6V9.7h2.5v1.1h.1c.4-.7 1.2-1.3 2.5-1.3 2.7 0 3.2 1.7 3.2 4V18z"/></svg></a>
            </div>
          </div>
        </div>
      </footer>

      {/* ============= TWEAKS ============= */}
      <button
        className="tweaks-fab"
        id="tweaks-toggle"
        aria-label="Tweaks"
        type="button"
        onClick={() => setTweaksOpen((v) => !v)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>
      </button>
      <div className="tweaks-panel" id="tweaks-panel" style={{ display: tweaksOpen ? 'block' : 'none' }}>
        <div className="tweaks-title">
          Tweaks
          <button
            type="button"
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
          <div className="tweaks-label" style={{ marginBottom: 6 }}>Headline</div>
          <input
            className="tweaks-input"
            id="headline-input"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
        </div>
      </div>
    </>
  );
}
