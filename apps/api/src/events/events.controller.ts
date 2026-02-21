import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async list(
    @Req() req: { user: { id: string } },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.eventsService.findAll(req.user.id, from, to);
  }

  @Post()
  async create(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(req.user.id, dto);
  }

  @Patch(':id')
  async update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.eventsService.remove(req.user.id, id);
  }
}
