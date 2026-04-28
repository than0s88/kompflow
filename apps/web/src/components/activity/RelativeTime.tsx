interface Props {
  iso: string;
}

const RTF =
  typeof Intl !== 'undefined' && Intl.RelativeTimeFormat
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    : null;

const ABS_FMT =
  typeof Intl !== 'undefined' && Intl.DateTimeFormat
    ? new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

export default function RelativeTime({ iso }: Props) {
  return <span title={ABS_FMT?.format(new Date(iso))}>{relative(iso)}</span>;
}

export function relative(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = d - now;
  const diffSec = Math.round(diffMs / 1000);

  if (Math.abs(diffSec) < 60) return RTF?.format(diffSec, 'second') ?? 'just now';
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return RTF?.format(diffMin, 'minute') ?? `${Math.abs(diffMin)}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return RTF?.format(diffHr, 'hour') ?? `${Math.abs(diffHr)}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (Math.abs(diffDay) < 30) return RTF?.format(diffDay, 'day') ?? `${Math.abs(diffDay)}d ago`;
  const diffMonth = Math.round(diffDay / 30);
  if (Math.abs(diffMonth) < 12)
    return RTF?.format(diffMonth, 'month') ?? `${Math.abs(diffMonth)}mo ago`;
  const diffYear = Math.round(diffMonth / 12);
  return RTF?.format(diffYear, 'year') ?? `${Math.abs(diffYear)}y ago`;
}
