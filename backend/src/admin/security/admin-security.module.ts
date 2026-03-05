import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminSecurityController } from './admin-security.controller';
import { AdminSecurityService } from './admin-security.service';

@Module({
  imports: [PrismaModule, CryptoModule, AuditModule],
  controllers: [AdminSecurityController],
  providers: [AdminSecurityService],
})
export class AdminSecurityModule {}
