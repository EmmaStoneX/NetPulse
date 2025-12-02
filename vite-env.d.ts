export {};

declare global {
  // Define ImportMetaEnv to resolve types for import.meta.env
  interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_TAVILY_API_KEY: string;
    [key: string]: any;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  // Augment NodeJS.ProcessEnv to include our keys.
  // This merges with the existing @types/node definition if present, avoiding conflicts.
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
      VITE_TAVILY_API_KEY: string;
      [key: string]: string | undefined;
    }
  }

  // Augment Window to include process for the polyfill in index.tsx
  interface Window {
    process: {
      env: NodeJS.ProcessEnv;
    };
  }
}
