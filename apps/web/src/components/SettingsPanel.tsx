import { useEffect, useRef, type ReactNode } from 'react';
import {
  useSettings,
  type CardSize,
  type Density,
  type MotionMultiplier,
  type Theme,
} from '../lib/settings';
import '../styles/app.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

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

export default function SettingsPanel({ open, onClose }: Props) {
  const { settings, update, reset } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Focus panel on open for accessibility.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="settings-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        ref={panelRef}
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
      >
        <header className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="settings-close"
            aria-label="Close settings"
            title="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div className="settings-body">
          <SettingsRow
            label="Theme"
            hint="Toggle light or dark interface."
          >
            <Segmented
              value={settings.theme}
              options={THEME_OPTIONS}
              onChange={(v) => update({ theme: v })}
            />
          </SettingsRow>

          <SettingsRow
            label="Animation speed"
            hint="Scale all transitions, or turn motion off."
          >
            <Segmented
              value={settings.motion}
              options={MOTION_OPTIONS}
              onChange={(v) => update({ motion: v })}
            />
          </SettingsRow>

          <SettingsRow
            label="Board density"
            hint="Spacing between cards and lanes."
          >
            <Segmented
              value={settings.density}
              options={DENSITY_OPTIONS}
              onChange={(v) => update({ density: v })}
            />
          </SettingsRow>

          <SettingsRow
            label="Card size"
            hint="Padding and font size on every card."
          >
            <Segmented
              value={settings.cardSize}
              options={CARD_SIZE_OPTIONS}
              onChange={(v) => update({ cardSize: v })}
            />
          </SettingsRow>
        </div>

        <footer className="settings-footer">
          <button
            type="button"
            className="btn-ghost"
            onClick={reset}
          >
            Reset to defaults
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Done
          </button>
        </footer>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <div className="settings-row-label">{label}</div>
        {hint && <div className="settings-row-hint">{hint}</div>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

interface SegmentedProps<T extends string | number> {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="settings-segmented" role="radiogroup">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            type="button"
            key={String(opt.value)}
            role="radio"
            aria-checked={selected}
            className={
              'settings-segmented-btn' + (selected ? ' is-active' : '')
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
