import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FileService } from './file.service';

@Controller('servers/:id/files')
@UseGuards(JwtAuthGuard)
export class FileController {
  constructor(private fileService: FileService) {}

  @Get()
  listFiles(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Query('path') path?: string,
  ) {
    return this.fileService.listFiles(id, user.sub, path || '/');
  }

  @Get('read')
  readFile(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Query('path') path: string,
  ) {
    return this.fileService.readFile(id, user.sub, path);
  }

  @Post('write')
  @HttpCode(200)
  writeFile(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: { path: string; content: string },
  ) {
    return this.fileService.writeFile(id, user.sub, body.path, body.content);
  }

  @Delete()
  deleteFile(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Query('path') path: string,
  ) {
    return this.fileService.deleteFile(id, user.sub, path);
  }

  @Post('mkdir')
  @HttpCode(200)
  createDirectory(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: { path: string },
  ) {
    return this.fileService.createDirectory(id, user.sub, body.path);
  }

  @Post('rename')
  @HttpCode(200)
  renameFile(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: { oldPath: string; newPath: string },
  ) {
    return this.fileService.renameFile(id, user.sub, body.oldPath, body.newPath);
  }
}
