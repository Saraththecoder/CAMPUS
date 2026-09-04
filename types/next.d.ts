// types/next.d.ts
// Type declarations for Next.js App Router route contexts.
// Fixes the RouteContext generic type used in API route handlers.

declare global {
  type RouteContext<TPath extends string = string> = {
    params: Promise<Record<string, string>>
  }
}

export {}
