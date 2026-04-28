import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { autoseedWorkspaces } from './prisma/autoseed';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(cookieParser());

  app.enableCors({
    origin: config.get<string>('WEB_ORIGIN') ?? 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');

  // Backfill workspaces for any pre-existing users.
  await autoseedWorkspaces(app.get(PrismaService));

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);
  console.log(`🚀 API listening on http://localhost:${port}/api`);
}

bootstrap();
