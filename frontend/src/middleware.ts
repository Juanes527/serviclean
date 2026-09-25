import { NextRequest, NextResponse } from 'next/server';

const RUTAS_PROTEGIDAS = ['/cliente', '/personal', '/admin'];

export function middleware(peticion: NextRequest) {
  const rutaProtegida = RUTAS_PROTEGIDAS.some((ruta) => peticion.nextUrl.pathname.startsWith(ruta));
  const tieneSesion = peticion.cookies.has('serviclean_token');

  if (rutaProtegida && !tieneSesion) {
    const url = peticion.nextUrl.clone();
    url.pathname = '/iniciar-sesion';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/cliente/:path*', '/personal/:path*', '/admin/:path*'],
};
