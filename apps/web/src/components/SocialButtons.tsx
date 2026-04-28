import '../styles/app.css';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

function startGoogle() {
  window.location.href = `${API_URL}/api/auth/google`;
}

export default function SocialButtons() {
  return (
    <div className="auth-social">
      <button
        type="button"
        onClick={startGoogle}
        className="btn-secondary"
      >
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.7 1.1 7.8 2.9l5.7-5.7A20 20 0 1 0 24 44c11 0 20-8.9 20-20 0-1.2-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8a12 12 0 0 1 19.1-4.5l5.7-5.7A20 20 0 0 0 6.3 14.1z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.6l6.3 5.2C42 35 44 30 44 24c0-1.2-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </button>
    </div>
  );
}
