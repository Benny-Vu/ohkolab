/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Both are optional: without them the app runs in guest mode. */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
