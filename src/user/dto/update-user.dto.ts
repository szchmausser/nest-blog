//nest generate class user/dto/update-user.dto --no-spec --flat
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

// PartialType toma todos los campos de CreateUserDto y los hace opcionales
// pero manteniendo las validaciones (@IsEmail, @MinLength, etc.)
export class UpdateUserDto extends PartialType(CreateUserDto) {
  // Agregamos campos que NO estaban en el Create, pero que sí se pueden actualizar
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  deactivationReason?: string;
}
