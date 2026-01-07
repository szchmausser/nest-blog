// Autenticacion 1.1
// Instalación de Dependencias - Lo primero es instalar las librerías necesarias para JWT y Passport.
// npm install @nestjs/passport passport passport-jwt @nestjs/jwt bcrypt
// npm install -D @types/passport-jwt @types/bcrypt

// Autenticacion 2.1
// Interface del Payload - Define qué datos viajarán dentro del token JWT encriptado.

export interface UserPayload {
  id: number;
  email: string;
}
