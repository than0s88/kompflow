import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActivityModule } from './activity/activity.module';
import { AuthModule } from './auth/auth.module';
import { BoardsModule } from './boards/boards.module';
import { CardsModule } from './cards/cards.module';
import { ColumnsModule } from './columns/columns.module';
import { PrismaModule } from './prisma/prisma.module';
import { PusherModule } from './pusher/pusher.module';
import { ReorderModule } from './reorder/reorder.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PusherModule,
    ActivityModule,
    WorkspacesModule,
    AuthModule,
    BoardsModule,
    ColumnsModule,
    CardsModule,
    ReorderModule,
  ],
})
export class AppModule {}
