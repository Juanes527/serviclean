/**
 * En producción el frontend actúa como proxy del backend: el navegador llama a /api/* en el mismo
 * dominio del frontend y Next.js reenvía la petición a BACKEND_URL. Así la cookie de sesión queda en
 * el dominio del frontend (la ve el middleware y no se bloquea como cookie de terceros).
 * En desarrollo local BACKEND_URL no se define y el frontend llama directo a NEXT_PUBLIC_API_URL.
 */
const urlBackend = process.env.BACKEND_URL?.replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (!urlBackend) return [];
    return [{ source: '/api/:ruta*', destination: `${urlBackend}/:ruta*` }];
  },
};

export default nextConfig;
