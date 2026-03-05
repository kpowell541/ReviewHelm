import { Module } from '@nestjs/common';
import { KeyCryptoService } from './key-crypto.service';

@Module({
  providers: [KeyCryptoService],
  exports: [KeyCryptoService],
})
export class CryptoModule {}
