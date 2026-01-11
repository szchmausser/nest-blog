import { Module, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schemas';

/**
 * Token para la conexión PostgreSQL.
 * Uso interno del módulo para gestionar el ciclo de vida.
 */
export const PG_CONNECTION = Symbol('PG_CONNECTION');

/**
 * Token de inyección para el cliente Drizzle.
 * Usar @Inject(DRIZZLE_DB) en servicios.
 */
export const DRIZZLE_DB = Symbol('DRIZZLE_DB');

/**
 * Tipo exacto del cliente Drizzle.
 */
export type DrizzleDB = PostgresJsDatabase<typeof schema>;

@Module({
  imports: [ConfigModule],
  providers: [
    // Provider 1: PostgreSQL Connection Pool
    {
      provide: PG_CONNECTION,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const url = configService.get<string>('DATABASE_URL');
        if (!url) {
          throw new Error('DATABASE_URL is not defined');
        }

        const connection = postgres(url, {
          ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
        });

        // Verificar conexión
        try {
          await connection`SELECT 1`;
          Logger.log('✅ PostgreSQL connected successfully', 'DatabaseModule');
        } catch (error) {
          Logger.error(
            '❌ Failed to connect to PostgreSQL',
            error,
            'DatabaseModule',
          );
          throw error;
        }

        return connection;
      },
    },
    // Provider 2: Drizzle Client
    {
      provide: DRIZZLE_DB,
      inject: [PG_CONNECTION],
      useFactory: (connection: postgres.Sql) => {
        return drizzle(connection, { schema });
      },
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(PG_CONNECTION) private connection: postgres.Sql) {}

  async onModuleDestroy() {
    if (this.connection) {
      await this.connection.end();
      this.logger.log('✅ PostgreSQL connection closed');
    }
  }
}
