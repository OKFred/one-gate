declare module "*.sql?raw" {
  const content: string;
  export default content;
}

declare module "cloudflare:workers" {
  const content: Record<string, unknown>;
  export default content;
}
