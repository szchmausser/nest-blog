//nest generate class user/dto/create-user.dto --no-spec --flat
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'El formato del email es inválido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  // Opcional: Si permites asignar roles básicos en el momento del registro
  // Aunque usualmente se hace en un endpoint de administración separado.
  @IsOptional()
  roleIds?: number[];
}
