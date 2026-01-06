import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  findAll() {
    return { message: 'All users found' };
  }

  findOne(id: number) {
    return { message: 'User found', data: { id } };
  }

  create(data: CreateUserDto) {
    return { message: 'User created', data };
  }

  update(id: number, dto: UpdateUserDto) {
    return { message: 'User updated', id, dto };
  }

  remove(id: number) {
    return { message: 'User removed', id };
  }
}
