// Autenticacion 2.4
// Interface del Token - Define la estructura interna del token JWT decodificado (lo que lee la estrategia).

export interface JwtPayload {
  sub: number; // ID del usuario
  email: string; // Email del usuario
  iat?: number; // Issued at (fecha creación)
  exp?: number; // Expiration (fecha expiración)
}
