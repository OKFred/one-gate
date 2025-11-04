// import type { App } from "@/types/app";
import fs from "fs";
import path from "path";
import { swaggerUI } from "@hono/swagger-ui";
import { Scalar } from "@scalar/hono-api-reference";
import { App } from "@/types/app";
import { LanguageKey } from "@/middleware/i18n";
import { HTTPException } from "hono/http-exception";

export default function docRegister(app: App) {
  app.get("/doc", async (c) => {
    const docHtmlPath = path.join(process.cwd(), "src", "doc", "index.html");
    try {
      const htmlContent = fs.readFileSync(docHtmlPath, "utf-8");
      return c.body(htmlContent, 200, { "Content-Type": "text/html" });
    } catch (e) {
      throw new HTTPException(404, {
        message: "i18n.middleware.doc.notFound" satisfies LanguageKey,
      });
    }
  });
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
  app.get("/doc/swagger-ui.css", async (c) => {
    const docHtmlPath = path.join(
      process.cwd(),
      "src",
      "doc",
      "swagger-ui.css"
    );
    const htmlContent = fs.readFileSync(docHtmlPath, "utf-8");
    return c.body(htmlContent, 200, { "Content-Type": "text/css" });
  });
  app.get("/doc/swagger-ui-bundle.js", async (c) => {
    const docHtmlPath = path.join(
      process.cwd(),
      "src",
      "doc",
      "swagger-ui-bundle.js"
    );
    const htmlContent = fs.readFileSync(docHtmlPath, "utf-8");
    return c.body(htmlContent, 200, { "Content-Type": "text/javascript" });
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
