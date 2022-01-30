import { Module } from '@nestjs/common';

import { ProjectModule } from './modules/project/project.module';
import { PrismaModule } from './common/modules/prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, ProjectModule],
})
export class AppModule {}
