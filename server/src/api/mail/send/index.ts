import type { AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";
import pathRegister from "@/api/pathRegister";
import single from "./single/index";

function createApp() {
  const app = new OpenAPIHono<AppBindings>();
  const arr = [single];
  arr.forEach(({ pathObj, controller, componentArr }) => {
    pathRegister(app, pathObj, controller);
    if (componentArr) {
      componentArr.forEach((component) => {
        app.openAPIRegistry.registerComponent(
          "schemas",
          component.name,
          component.component as any,
        );
      });
    }
  });
  return app;
}

export default createApp;
