/// <reference types="vite/client" />

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.css' {
  const content: string;
  export default content;
}

interface Navigator {
  standalone?: boolean;
}

declare const global: typeof globalThis;
