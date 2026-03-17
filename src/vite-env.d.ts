/// <reference types="vite/client" />

/**
 * Type declarations for Vite-specific features
 */

declare module '*.css?url' {
  const src: string;
  export default src;
}

declare module '*.css?inline' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const value: unknown;
  export default value;
}
