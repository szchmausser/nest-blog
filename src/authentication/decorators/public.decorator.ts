// Autenticacion 2.2
// Decorador Público - Nos servirá para marcar rutas exentas de seguridad.

import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ENDPOINT_DECORATOR = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_ENDPOINT_DECORATOR, true);
