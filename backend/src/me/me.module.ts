import { Module } from '@nestjs/common';
import { AuditModule } from '../common/audit/audit.module';
import { CryptoModule } from '../common/crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [PrismaModule, CryptoModule, AuditModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
