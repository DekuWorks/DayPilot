import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuggestScheduleDto } from './dto/suggest-schedule.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('suggest-schedule')
  async suggestSchedule(
    @Req() req: { user: { id: string } },
    @Body() dto: SuggestScheduleDto,
  ) {
    return this.aiService.suggestSchedule(req.user.id, dto.prompt);
  }
}
