import { swaggerUI } from "@hono/swagger-ui";
import { Scalar } from "@scalar/hono-api-reference";
import type { App } from "@/types/app";

export default function docRegister(app: App) {
  app.get("/doc", swaggerUI({ url: "/doc.json" }));
  app.doc31("/doc.json", {
    openapi: "3.1.0",
    info: {
      version: "1.0.0",
      title: "My API",
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  });
  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });
  app.get(
    "/doc_ref",
    Scalar({
      layout: "modern",
      theme: "kepler",
      url: "/doc.json",
    })
  );
}
