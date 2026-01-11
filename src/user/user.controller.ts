import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InstanceGuard } from 'src/authorization/guards/instance.guard';
import { GlobalGuard } from 'src/authorization/guards/global.guard';
import { CheckInstance } from 'src/authorization/decorators/check-instance.decorator';
import { CheckGlobal } from 'src/authorization/decorators/check-global.decorator';
import { ActionEnum } from 'src/database/types';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(GlobalGuard)
  @CheckGlobal((ability) => ability.can(ActionEnum.read, 'User'))
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseGuards(GlobalGuard)
  @CheckGlobal((ability) => ability.can(ActionEnum.read, 'User'))
  findOne(@Param('id') id: number) {
    return this.userService.findOne(id);
  }

  @Get(':id/permissions')
  @UseGuards(InstanceGuard)
  @CheckInstance({ action: ActionEnum.read, subject: 'User' })
  getUserPermissions(@Param('id') id: number) {
    return this.userService.getUserPermissions(id);
  }

  @Post()
  @UseGuards(GlobalGuard)
  @CheckGlobal((ability) => ability.can(ActionEnum.create, 'User'))
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Patch(':id')
  @UseGuards(InstanceGuard)
  @CheckInstance({ action: ActionEnum.update, subject: 'User' })
  update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(InstanceGuard)
  @CheckInstance({ action: ActionEnum.delete, subject: 'User' })
  remove(@Param('id') id: number) {
    return this.userService.remove(id);
  }
}
