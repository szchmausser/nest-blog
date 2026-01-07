import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class UserService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll() {
    const users = await this.databaseService.user.findMany();
    return users;
  }

  async findOne(id: number) {
    const user = await this.databaseService.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Autenticacion 8.1
  async findOneByEmail(email: string) {
    return this.databaseService.user.findUnique({
      where: { email },
    });
  }

  // Autenticacion 8.2
  async create(data: CreateUserDto) {
    const user = await this.databaseService.user.create({ data });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.databaseService.user.update({
      where: { id },
      data: updateUserDto,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async remove(id: number) {
    const deleted = await this.databaseService.user.delete({ where: { id } });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safe } = deleted;
    return safe;
  }

  // manualFireExceptionTest() {
  // ----------------------------------------------------------------
  // BLOQUE DE PRUEBA TEMPORAL PARA DISPARAR MANUALMENTE UN ERROR DE PRISMA
  // ----------------------------------------------------------------
  // throw new Prisma.PrismaClientKnownRequestError('Simulación de duplicado', {
  //   code: 'P2003',
  //   clientVersion: '7.2.0',
  //   meta: {
  //     modelName: 'User',
  //     driverAdapterError: {
  //       cause: {
  //         constraint: { fields: ['email'] },
  //       },
  //     },
  //   },
  // });
  // throw new Prisma.PrismaClientKnownRequestError('No encontrado', {
  //   code: 'P2025',
  //   clientVersion: '7.2.0',
  //   meta: { modelName: 'Producto', cause: 'Record not found' },
  // });
  // throw new Prisma.PrismaClientKnownRequestError('Fallo de relación', {
  //   code: 'P2003',
  //   clientVersion: '7.2.0',
  //   meta: { field_name: 'categoriaId', modelName: 'Producto' },
  // });
  // throw new Prisma.PrismaClientInitializationError(
  //   'Error de conexión',
  //   '7.2.0',
  //   'P1001',
  // );
  // throw new Prisma.PrismaClientValidationError(
  //   'Datos inconsistentes con el modelo',
  //   {
  //     clientVersion: '7.2.0',
  //   },
  // );
  // throw new Prisma.PrismaClientKnownRequestError('Valor inválido', {
  //   code: 'P2005',
  //   clientVersion: '7.2.0',
  //   meta: {
  //     modelName: 'Producto',
  //     field_name: 'precio', // <--- Aquí es donde tu filtro busca el dato
  //   },
  // });
  // throw new Prisma.PrismaClientKnownRequestError('Valor inválido', {
  //   code: 'P2006',
  //   clientVersion: '7.2.0',
  //   meta: {
  //     modelName: 'Producto',
  //     field_name: 'precio', // <--- Aquí es donde tu filtro busca el dato
  //   },
  // });
  // ----------------------------------------------------------------
  // Fin del bloque de prueba
  // ----------------------------------------------------------------
  // }
}
