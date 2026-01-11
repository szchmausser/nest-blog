import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DRIZZLE_DB } from 'src/database/database.module';
import type { DrizzleDB } from 'src/database/database.module';
import { ResourceLoader } from 'src/authorization/interfaces/resource-loader.interface';
import { AuthorizationService } from 'src/authorization/authorization.service';
import { users } from 'src/database/schemas';
import { eq } from 'drizzle-orm';

/**
 * Campos públicos de usuario (sin password)
 */
const userPublicFields = {
  id: users.id,
  name: users.name,
  email: users.email,
  isActive: users.isActive,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  lastLoginAt: users.lastLoginAt,
};

@Injectable()
export class UserService implements ResourceLoader {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async findAll() {
    return this.db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });
  }

  async findOne(id: number) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  // Autenticacion 8.1
  async findOneByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  // Autenticacion 8.2
  async create(data: CreateUserDto) {
    const result = await this.db
      .insert(users)
      .values(data)
      .returning(userPublicFields);

    return result[0];
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const result = await this.db
      .update(users)
      .set(updateUserDto)
      .where(eq(users.id, id))
      .returning(userPublicFields);

    if (result.length === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return result[0];
  }

  async remove(id: number) {
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning(userPublicFields);

    if (result.length === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return result[0];
  }

  /**
   * Implementación de ResourceLoader para autorización.
   * Carga solo los campos necesarios para validar permisos.
   */
  async loadResourceForAuthorization(id: number) {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { id: true },
    });
  }

  /**
   * Obtiene los roles y permisos de un usuario de forma estructurada
   * Incluye:
   * - Roles asignados con sus permisos heredados
   * - Permisos directos (grants y revokes)
   */
  async getUserPermissions(id: number) {
    const user = await this.authorizationService.getUserWithPermissions(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }
}
