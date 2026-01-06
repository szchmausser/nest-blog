import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

//https://www.prisma.io/docs/guides/nestjs
@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly configService: ConfigService) {
    const url = configService.get<string>('DATABASE_URL');
    if (!url) {
      throw new Error('DATABASE_URL is not defined');
    }
    const adapter = new PrismaPg({
      connectionString: url,
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
