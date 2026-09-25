import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { ProveedorAvisos } from '@/components/Avisos';
import { ProveedorAutenticacion } from '@/utilidades/contextoAutenticacion';
import './globals.css';

const fuenteTexto = Inter({ subsets: ['latin'], display: 'swap', variable: '--fuente-texto' });
const fuenteTitulos = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700', '800'],
  variable: '--fuente-titulos',
});

export const metadata: Metadata = {
  title: {
    default: 'ServiClean · Servicios de limpieza doméstica',
    template: '%s · ServiClean',
  },
  description: 'Plataforma web para contratar y gestionar servicios de limpieza doméstica de forma sencilla y confiable.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0070c4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fuenteTexto.variable} ${fuenteTitulos.variable}`}>
      <body className="font-sans antialiased">
        <ProveedorAutenticacion>
          <ProveedorAvisos>{children}</ProveedorAvisos>
        </ProveedorAutenticacion>
      </body>
    </html>
  );
}
