import { Global, Module } from '@nestjs/common';
import { BoardsModule } from '../boards/boards.module';
import { PusherController } from './pusher.controller';
import { PusherService } from './pusher.service';

@Global()
@Module({
  imports: [BoardsModule],
  controllers: [PusherController],
  providers: [PusherService],
  exports: [PusherService],
})
export class PusherModule {}
