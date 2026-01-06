import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración del validador global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 1. Filtra lo que no esté en el DTO
      forbidNonWhitelisted: true, // 2. Lanza error si hay campos prohibidos
      transform: true, // 3. Convierte tipos (ej: string a number en IDs)
      transformOptions: {
        enableImplicitConversion: true, // Esto convertirá "true" a true
      },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
