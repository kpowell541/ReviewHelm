import { Injectable, NotFoundException } from '@nestjs/common';
import { COMPLIANCE_PACKS } from './compliance-packs';

@Injectable()
export class ComplianceService {
  listPacks() {
    return {
      items: COMPLIANCE_PACKS.map((pack) => ({
        id: pack.id,
        title: pack.title,
        description: pack.description,
        version: pack.version,
        controlsCount: pack.controls.length,
      })),
    };
  }

  getPackById(packId: string) {
    const pack = COMPLIANCE_PACKS.find((entry) => entry.id === packId);
    if (!pack) {
      throw new NotFoundException('Compliance pack not found');
    }
    return pack;
  }
}
