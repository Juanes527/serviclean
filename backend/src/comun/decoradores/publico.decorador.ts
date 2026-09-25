import { SetMetadata } from '@nestjs/common';

export const CLAVE_PUBLICO = 'publico';
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);
