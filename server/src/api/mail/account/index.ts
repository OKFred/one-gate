import type { AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";
import pathRegister from "@/api/pathRegister";

import { tableInit } from "./db.table";
import { componentMaker, routeMaker } from "@/middleware/encapsulation";
import service from "./service";

const nameSpace = "MailAccount";

function createApp() {
  tableInit();
  const app = new OpenAPIHono<AppBindings>();
  Array.from(Object.values(service)).forEach((obj) => {
    const { req, res, pathInfo } = obj;
    const subNameSpace = pathInfo.path
      .replace(/\//g, "_")
      .slice(1)
      .replace(/^\w/, (c) => c.toUpperCase());
    const componentArr = [
      componentMaker("request", {
        name: `${nameSpace}${subNameSpace}Req`,
        component: req,
      }),
      componentMaker("response", {
        name: `${nameSpace}${subNameSpace}Res`,
        component: res,
      }),
    ];
    const { pathObj, controller } = routeMaker({
      ...obj,
      nameSpace,
      reqSchema: req,
      componentArr,
    });
    pathRegister(app, pathObj, controller);
    componentArr.forEach((component) => {
      app.openAPIRegistry.registerComponent(
        "schemas",
        component.name,
        component.component as any
      );
    });
  });
  return app;
}

export default createApp;
