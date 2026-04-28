import { Global, Module, forwardRef } from '@nestjs/common';
import { BoardsModule } from '../boards/boards.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Global()
@Module({
  imports: [PrismaModule, forwardRef(() => BoardsModule)],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
