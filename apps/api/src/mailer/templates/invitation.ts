interface InvitationEmailContext {
  inviterName: string;
  workspaceName: string;
  acceptUrl: string;
  email: string;
  isExistingUser: boolean;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return c;
    }
  });
}

export function renderInvitationEmail(
  ctx: InvitationEmailContext,
): RenderedEmail {
  const inviter = escapeHtml(ctx.inviterName);
  const workspace = escapeHtml(ctx.workspaceName);
  const url = ctx.acceptUrl;
  const ctaLabel = ctx.isExistingUser
    ? 'Open the workspace'
    : 'Accept invitation';

  const subject = `${ctx.inviterName} invited you to ${ctx.workspaceName}`;

  const text = [
    `${ctx.inviterName} invited you to collaborate on the "${ctx.workspaceName}" workspace on Kompflow.`,
    '',
    ctx.isExistingUser
      ? `Open the workspace: ${url}`
      : `Create your account and join: ${url}`,
    '',
    "This link expires in 7 days. If you weren't expecting this email, you can ignore it.",
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#F7F7F5;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#172B4D;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F7F7F5;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#FFFFFF;border-radius:12px;border:1px solid #E1E4E8;">
            <tr>
              <td style="padding:32px 40px 8px 40px;">
                <div style="font-size:13px;font-weight:600;color:#0E7C47;letter-spacing:0.04em;text-transform:uppercase;">Kompflow</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 40px 24px 40px;">
                <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px 0;">You've been invited to <strong>${workspace}</strong></h1>
                <p style="margin:0;font-size:15px;line-height:1.55;color:#44546F;">
                  <strong>${inviter}</strong> invited you to collaborate on the <strong>${workspace}</strong> workspace on Kompflow.
                </p>
              </td>
            </tr>
            <tr>
              <td align="left" style="padding:8px 40px 24px 40px;">
                <a href="${url}" style="display:inline-block;background:#0E7C47;color:#FFFFFF;text-decoration:none;font-weight:600;padding:11px 18px;border-radius:8px;font-size:14px;">${ctaLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px 40px;font-size:13px;color:#6B778C;line-height:1.55;">
                Or copy and paste this link into your browser:<br/>
                <span style="word-break:break-all;color:#0E7C47;">${url}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 40px;border-top:1px solid #EEF0F2;font-size:12px;color:#8993A4;">
                This invitation expires in 7 days. If you weren't expecting it, you can safely ignore this message.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
