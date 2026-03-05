import { Body, Controller, Post } from '@nestjs/common';
import { AdminOnly } from '../../common/auth/admin.decorator';
import { AdminCiService } from './admin-ci.service';
import { CiPolicyCheckDto } from './dto/ci-policy-check.dto';

@Controller('admin/ci')
@AdminOnly()
export class AdminCiController {
  constructor(private readonly ciService: AdminCiService) {}

  @Post('policy-check')
  async policyCheck(@Body() body: CiPolicyCheckDto) {
    return this.ciService.runPolicyCheck(body);
  }
}
