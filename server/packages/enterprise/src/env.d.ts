declare module "*.sql?raw" {
  const content: string;
  export default content;
}

declare module "*.sql" {
  const content: string;
  export default content;
}

declare module "cloudflare:workers" {
  const content: any;
  export default content;
}
