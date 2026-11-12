// Just what vite.config.ts uses from Node (the project does not depend on @types/node).
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function writeFileSync(path: string, data: string): void;
}
declare module 'node:path' {
  export function resolve(...parts: string[]): string;
}
