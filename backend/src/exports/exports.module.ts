import { Module } from '@nestjs/common';
import { BackupsModule } from '../backups/backups.module';
import { ExportsController } from './exports.controller';

@Module({
  imports: [BackupsModule],
  controllers: [ExportsController],
})
export class ExportsModule {}
