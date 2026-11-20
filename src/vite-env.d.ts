/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '@babel/core' {
  export interface TransformOptions {
    filename?: string;
    babelrc?: boolean;
    configFile?: boolean;
    sourceMaps?: boolean;
    parserOpts?: {
      plugins?: string[];
    };
    plugins?: ReadonlyArray<string | readonly [string, Record<string, unknown>]>;
  }

  export interface BabelFileResult {
    code?: string | null;
    map?: {
      version: number;
      sources: string[];
      names: string[];
      mappings: string;
      file?: string;
      sourcesContent?: string[];
    } | null;
  }

  export function transformSync(code: string, options?: TransformOptions): BabelFileResult | null;
}
