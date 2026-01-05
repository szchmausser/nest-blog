import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

//https://www.prisma.io/docs/guides/nestjs
@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({
      adapter,
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conexión a PostgreSQL establecida con éxito.');
    } catch (error) {
      this.logger.error('Error al conectar a la base de datos', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
