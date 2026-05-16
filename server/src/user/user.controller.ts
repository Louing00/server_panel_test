import { Controller, Get, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserService } from './user.service';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  getProfile(@CurrentUser() user: { sub: string; username: string }) {
    return this.userService.getProfile(user.sub);
  }

  @Delete()
  deleteAccount(@CurrentUser() user: { sub: string }) {
    return this.userService.deleteAccount(user.sub);
  }
}
