import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from '../../generated/prisma/client';
import { InternalServerErrorException } from '@nestjs/common/exceptions/internal-server-error.exception';

@Injectable()
export class UserService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll() {
    const users = await this.databaseService.user.findMany();
    return { message: 'Users retrieved', data: users };
  }

  async findOne(id: number) {
    const user = await this.databaseService.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return { message: 'User found', data: userWithoutPassword };
  }

  async create(data: CreateUserDto) {
    try {
      const user = await this.databaseService.user.create({ data });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return { message: 'User created', data: userWithoutPassword };
    } catch (error) {
      /**
       * MANEJO DE EXCEPCIONES ESPECÍFICAS DE PRISMA
       * P2002: Código de error de Prisma para violación de restricción única (Unique Constraint).
       */
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'A user with the provided unique field already exists.',
          );
        }
      }

      /**
       * ERROR GENÉRICO
       * Si el error no es por duplicado, lanzamos un 500 estándar para no
       * exponer detalles técnicos de la base de datos al cliente.
       */
      throw new InternalServerErrorException(
        'Ocurrió un error inesperado al intentar crear el usuario.',
      );
    }
  }

  async update(id: number, dto: UpdateUserDto) {
    try {
      const user = await this.databaseService.user.update({
        where: { id },
        data: dto,
      });
      return { message: 'User updated', data: user };
    } catch (error) {
      /**
       * MANEJO DE EXCEPCIONES ESPECÍFICAS DE PRISMA
       * P2002: Código de error de Prisma para violación de restricción única (Unique Constraint).
       */
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`User with id ${id} not found`);
        }
      }

      /**
       * ERROR GENÉRICO
       * Si el error no es por duplicado, lanzamos un 500 estándar para no
       * exponer detalles técnicos de la base de datos al cliente.
       */
      throw new InternalServerErrorException(
        'Ocurrió un error inesperado al intentar actualizar el usuario.',
      );
    }
  }

  async remove(id: number) {
    try {
      const deleted = await this.databaseService.user.delete({ where: { id } });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...safe } = deleted;
      return { message: 'User deleted', data: safe };
    } catch (error) {
      /**
       * MANEJO DE EXCEPCIONES ESPECÍFICAS DE PRISMA
       * P2002: Código de error de Prisma para violación de restricción única (Unique Constraint).
       */
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`User with id ${id} not found`);
        }
      }

      /**
       * ERROR GENÉRICO
       * Si el error no es por duplicado, lanzamos un 500 estándar para no
       * exponer detalles técnicos de la base de datos al cliente.
       */
      throw new InternalServerErrorException(
        'Ocurrió un error inesperado al intentar eliminar el usuario.',
      );
    }
  }
}
