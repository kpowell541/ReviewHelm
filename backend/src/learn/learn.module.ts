import { Module } from '@nestjs/common';
import { GapsModule } from '../gaps/gaps.module';
import { LearnController } from './learn.controller';

@Module({
  imports: [GapsModule],
  controllers: [LearnController],
})
export class LearnModule {}
