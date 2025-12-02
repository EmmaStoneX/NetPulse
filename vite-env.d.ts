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
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
      VITE_TAVILY_API_KEY: string;
      [key: string]: string | undefined;
    }
  }

  // Remove incompatible 'var process' declaration that conflicts with @types/node

  interface Window {
    process: {
      env: NodeJS.ProcessEnv;
    };
  }
}