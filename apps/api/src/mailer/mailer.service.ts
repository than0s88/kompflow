import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendMailResult {
  ok: boolean;
  error?: string;
}

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;
  private fromAddress = '';

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>('SMTP_HOST');
    const portStr = this.config.get<string>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_APP_PASSWORD');
    const from = this.config.get<string>('SMTP_FROM');
    const secureRaw = this.config.get<string>('SMTP_SECURE') ?? 'true';

    if (!host || !user || !pass || !from) {
      this.logger.warn(
        'SMTP not configured — invitation emails will be logged to stdout only. Set SMTP_HOST/SMTP_USER/SMTP_APP_PASSWORD/SMTP_FROM to enable.',
      );
      return;
    }

    const port = portStr ? Number(portStr) : 465;
    const secure = secureRaw === 'true';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    this.fromAddress = from;
    this.logger.log(
      `Mailer ready — host=${host} port=${port} secure=${secure}`,
    );
  }

  /**
   * Best-effort send. Never throws — returns { ok, error? } so callers
   * can decide whether to surface a "copy link" fallback.
   */
  async send(input: SendMailInput): Promise<SendMailResult> {
    if (!this.transporter) {
      // No SMTP — log the message so a reviewer running locally can still
      // grab the invite link from the API logs.
      this.logger.warn(
        `[mailer disabled] would send to=${input.to} subject="${input.subject}"\n${input.text}`,
      );
      return { ok: false, error: 'smtp-not-configured' };
    }
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`mail send failed: ${msg}`);
      return { ok: false, error: msg };
    }
  }
}
