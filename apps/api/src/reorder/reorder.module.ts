import { Module } from '@nestjs/common';
import { BoardsModule } from '../boards/boards.module';
import { ReorderController } from './reorder.controller';
import { ReorderService } from './reorder.service';

@Module({
  imports: [BoardsModule],
  controllers: [ReorderController],
  providers: [ReorderService],
})
export class ReorderModule {}
