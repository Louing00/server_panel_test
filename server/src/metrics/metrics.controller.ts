import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MetricsService } from './metrics.service';

@Controller('servers/:id/metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('latest')
  getLatest(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.metricsService.getLatest(id, user.sub);
  }

  @Get()
  getHistory(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.metricsService.getHistory(id, user.sub, from, to);
  }
}
