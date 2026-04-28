import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UploadsController } from './uploads.controller';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');

/**
 * File-attachment module.
 *
 * - `POST /api/uploads` accepts a single `file` part (multipart/form-data),
 *   stores it on disk, returns `{ url, name, size, mimeType }`.
 * - `GET /uploads/<filename>` serves the file (no /api prefix because
 *   ServeStaticModule binds at the application root).
 *
 * The 25MB limit, mime allowlist, and filename sanitization live in the
 * controller. The disk path is configurable via UPLOAD_DIR; in docker we
 * mount a named volume there so files survive container restarts.
 */
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: UPLOAD_DIR,
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        // 30-day cache for uploaded assets — they're content-addressed by id.
        maxAge: 30 * 24 * 60 * 60 * 1000,
        immutable: true,
      },
    }),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
