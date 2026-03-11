import { defineConfig, loadEnv } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      createHtmlPlugin({
        inject: {
          data: {
            SUPABASE_URL: env.VITE_SUPABASE_URL || 'INSERISCI_QUI_IL_TUO_SUPABASE_URL',
            SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || 'INSERISCI_QUI_LA_TUA_SUPABASE_ANON_KEY',
          },
        },
      }),
    ],
  };
});
