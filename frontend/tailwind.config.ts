import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Azul ServiClean: acciones principales, navegación activa y enlaces.
        marca: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36aaf5',
          500: '#0c8ee6',
          600: '#0070c4',
          700: '#01599f',
          800: '#064b83',
          900: '#0b3f6d',
          950: '#072849',
        },
        // Turquesa de apoyo: frescura, acentos de marca y detalles decorativos.
        fresco: {
          50: '#effefb',
          100: '#c8fff4',
          200: '#91fee9',
          300: '#53f5dc',
          400: '#1fe0c8',
          500: '#06c4b0',
          600: '#019e90',
          700: '#067e74',
          800: '#0a645d',
          900: '#0e524d',
        },
        fondo: '#f6f9fc',
      },
      fontFamily: {
        sans: ['var(--fuente-texto)', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
        display: ['var(--fuente-titulos)', 'var(--fuente-texto)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        suave: '0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)',
        elevada: '0 4px 6px -2px rgb(15 23 42 / 0.05), 0 12px 24px -6px rgb(15 23 42 / 0.10)',
        flotante: '0 24px 48px -12px rgb(15 23 42 / 0.25)',
      },
      keyframes: {
        aparecer: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        desvanecer: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        escalar: {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        deslizar: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        subir: {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        brillo: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        aparecer: 'aparecer 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        desvanecer: 'desvanecer 160ms ease-out both',
        escalar: 'escalar 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        deslizar: 'deslizar 240ms cubic-bezier(0.16, 1, 0.3, 1) both',
        subir: 'subir 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
        brillo: 'brillo 1.4s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
