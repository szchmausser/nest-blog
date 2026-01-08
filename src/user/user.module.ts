import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseService } from 'src/database/database.service';
import { AuthorizationModule } from 'src/authorization/authorization.module';

@Module({
  imports: [AuthorizationModule],
  controllers: [UserController],
  providers: [UserService, DatabaseService],
  // Autenticacion 9.1 - Exportar UserService para que otros módulos que importen UserModule pueden usar UserService, en este caso AuthenticationService
  exports: [UserService],
})
export class UserModule {}
