// Autenticacion 4.1
// Configuramos el módulo que agrupa la estrategia y el servicio de JWT.
// Orden de Importancia:
// 1. Importar `PassportModule`.
// 2. Configurar `JwtModule.register()` con el secreto y tiempo de expiración.
// 3. PROVEER `JwtStrategy` (¡Crucial para que funcione el Guard!).
import { Module } from '@nestjs/common';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from 'src/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [
    PassportModule,
    UserModule,
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey', // In production use environment variable
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, JwtStrategy],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
