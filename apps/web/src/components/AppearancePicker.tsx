import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ACCENT_PALETTES,
  useSettings,
  type Accent,
  type CardSize,
  type Density,
  type MotionMultiplier,
  type Theme,
} from '../lib/settings';

const THEME_OPTIONS: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const MOTION_OPTIONS: ReadonlyArray<{ value: MotionMultiplier; label: string }> = [
  { value: 0, label: 'Off' },
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 1.5, label: '1.5×' },
  { value: 2, label: '2×' },
];

const DENSITY_OPTIONS: ReadonlyArray<{ value: Density; label: string }> = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfy', label: 'Comfy' },
  { value: 'cozy', label: 'Cozy' },
];

const CARD_SIZE_OPTIONS: ReadonlyArray<{ value: CardSize; label: string }> = [
  { value: 'small', label: 'Small' },
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
];

const ACCENT_OPTIONS: ReadonlyArray<{ value: Accent; label: string }> = [
  { value: 'green', label: 'Emerald' },
  { value: 'blue', label: 'Sky' },
  { value: 'purple', label: 'Violet' },
  { value: 'red', label: 'Crimson' },
  { value: 'orange', label: 'Tangerine' },
  { value: 'pink', label: 'Rose' },
  { value: 'teal', label: 'Lagoon' },
  { value: 'gray', label: 'Slate' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'lime', label: 'Lime' },
  { value: 'amber', label: 'Amber' },
  { value: 'midnight', label: 'Midnight' },
];

const GRADIENT_OPTIONS: ReadonlyArray<{ value: Accent; label: string }> = [
  { value: 'sunset', label: 'Sunset' },
  { value: 'aurora', label: 'Aurora' },
  { value: 'cosmic', label: 'Cosmic' },
  { value: 'ember', label: 'Ember' },
  { value: 'ocean', label: 'Deep ocean' },
  { value: 'sakura', label: 'Sakura' },
  { value: 'mint', label: 'Mint' },
  { value: 'twilight', label: 'Twilight' },
  { value: 'volcano', label: 'Volcano' },
  { value: 'glacier', label: 'Glacier' },
  { value: 'forest', label: 'Forest mist' },
  { value: 'royal', label: 'Royal' },
];

interface Props {
  /** CSS class for the trigger button. Defaults to a ghost button. */
  triggerClassName?: string;
  /** Optional extra wrapper class — used for placement variants. */
  variant?: 'default' | 'sidebar';
}

export default function AppearancePicker({
  triggerClassName,
  variant = 'default',
}: Props = {}) {
  const { settings, update, reset } = useSettings();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  // Position the panel as `position: fixed` from the trigger's bounding rect
  // so it can never be clipped by sticky/transformed/overflow ancestors and
  // is bounded by the viewport regardless of where the trigger sits.
  const reposition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 12;
    const PANEL_W = 340;

    if (variant === 'sidebar') {
      // Anchor to the right of the trigger, top-aligned, fitting whatever
      // vertical space is left below the trigger top.
      const left = Math.min(rect.right + 8, window.innerWidth - PANEL_W - margin);
      const top = Math.max(margin, rect.top);
      const maxHeight = window.innerHeight - top - margin;
      setPanelStyle({
        position: 'fixed',
        top,
        left,
        width: PANEL_W,
        maxHeight,
      });
    } else {
      // Default (header trigger): anchor to the trigger's right edge, growing
      // downward. If panel would overflow the viewport, flip to grow upward.
      const top = rect.bottom + 8;
      const left = Math.max(
        margin,
        Math.min(rect.right - PANEL_W, window.innerWidth - PANEL_W - margin),
      );
      const spaceBelow = window.innerHeight - top - margin;
      setPanelStyle({
        position: 'fixed',
        top,
        left,
        width: PANEL_W,
        maxHeight: spaceBelow,
      });
    }
  };

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const onResize = () => reposition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger =
        wrapRef.current && wrapRef.current.contains(target);
      const insidePanel = panelRef.current && panelRef.current.contains(target);
      if (!insideTrigger && !insidePanel) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const triggerClass =
    triggerClassName ?? 'kf-btn kf-btn--ghost';

  return (
    <div
      ref={wrapRef}
      className={
        'kf-appearance' +
        (variant === 'sidebar' ? ' kf-appearance--sidebar' : '')
      }
    >
      <button
        ref={triggerRef}
        type="button"
        className={triggerClass + (open ? ' is-active' : '')}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span aria-hidden>🎨</span>
        <span>Appearance</span>
      </button>

      {open
        ? createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Appearance"
          className="kf-appearance__panel kf-appearance__panel--floating"
          style={panelStyle}
        >
          <header className="kf-appearance__head">
            <h3 className="kf-appearance__title">Appearance</h3>
            <button
              type="button"
              className="kf-appearance__close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </header>

          <div className="kf-appearance__body">
            <Row label="Theme" hint="Light or dark interface.">
              <Segmented
                value={settings.theme}
                options={THEME_OPTIONS}
                onChange={(v) => update({ theme: v })}
              />
            </Row>

            <Row label="Accent color" hint="Recolors buttons and highlights.">
              <ColorSwatches
                value={settings.accent}
                options={ACCENT_OPTIONS}
                onChange={(v) => update({ accent: v })}
              />
            </Row>

            <Row label="Gradient" hint="Painted across the board canvas.">
              <ColorSwatches
                value={settings.accent}
                options={GRADIENT_OPTIONS}
                onChange={(v) => update({ accent: v })}
              />
            </Row>

            <Row label="Animation" hint="Scale or disable transitions.">
              <Segmented
                value={settings.motion}
                options={MOTION_OPTIONS}
                onChange={(v) => update({ motion: v })}
              />
            </Row>

            <Row label="Density" hint="Spacing between cards and lanes.">
              <Segmented
                value={settings.density}
                options={DENSITY_OPTIONS}
                onChange={(v) => update({ density: v })}
              />
            </Row>

            <Row label="Card size" hint="Padding and font size on cards.">
              <Segmented
                value={settings.cardSize}
                options={CARD_SIZE_OPTIONS}
                onChange={(v) => update({ cardSize: v })}
              />
            </Row>
          </div>

          <footer className="kf-appearance__footer">
            <button type="button" className="kf-btn kf-btn--ghost" onClick={reset}>
              Reset all
            </button>
            <button
              type="button"
              className="kf-btn kf-btn--primary"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </footer>
        </div>,
        document.body,
      )
        : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="kf-appearance__row">
      <div className="kf-appearance__row-text">
        <div className="kf-appearance__row-label">{label}</div>
        {hint ? <div className="kf-appearance__row-hint">{hint}</div> : null}
      </div>
      <div className="kf-appearance__row-control">{children}</div>
    </div>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="kf-appearance__segmented" role="radiogroup">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            type="button"
            key={String(opt.value)}
            role="radio"
            aria-checked={selected}
            className={
              'kf-appearance__segbtn' + (selected ? ' is-active' : '')
            }
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ColorSwatches({
  value,
  options,
  onChange,
}: {
  value: Accent;
  options: ReadonlyArray<{ value: Accent; label: string }>;
  onChange: (value: Accent) => void;
}) {
  return (
    <div className="kf-appearance__swatches" role="radiogroup">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            type="button"
            key={opt.value}
            role="radio"
            aria-checked={selected}
            aria-label={opt.label}
            title={opt.label}
            className={
              'kf-appearance__swatch' + (selected ? ' is-active' : '')
            }
            style={{
              background:
                ACCENT_PALETTES[opt.value].boardBgGradient ??
                ACCENT_PALETTES[opt.value].accent,
            }}
            onClick={() => onChange(opt.value)}
          />
        );
      })}
    </div>
  );
}
