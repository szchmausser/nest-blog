import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Autenticacion 10.1
  /**
   * 2. MIDDLEWARE: Cookie Parser
   * ¿POR QUÉ ES NECESARIO?:
   * Por defecto, Node.js/Express/Nestjs no saben leer las cookies del encabezado de la petición.
   * Este middleware intercepta la cabecera 'Cookie', la procesa y la transforma en
   * un objeto manejable dentro de 'request.cookies'.
   * * Vínculo con la seguridad:
   * Es fundamental para que nuestra 'JwtStrategy' pueda extraer el token JWT
   * directamente de las cookies del navegador de forma automática.
   */
  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
