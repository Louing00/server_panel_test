import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ServerService } from './server.service';
import { CreateServerDto, UpdateServerDto } from './server.dto';

@Controller('servers')
@UseGuards(JwtAuthGuard)
export class ServerController {
  constructor(private serverService: ServerService) {}

  @Get()
  findAll(@CurrentUser() user: { sub: string }) {
    return this.serverService.findAll(user.sub);
  }

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateServerDto,
  ) {
    return this.serverService.create(user.sub, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateServerDto,
  ) {
    return this.serverService.update(user.sub, id, dto);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.serverService.delete(user.sub, id);
  }

  @Post(':id/health')
  checkHealth(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.serverService.checkHealth(user.sub, id);
  }
}
