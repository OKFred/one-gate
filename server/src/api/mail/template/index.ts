import type { AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";
import pathRegister from "@/api/pathRegister";
import addMailTemplate from "./add";
import getMailTemplate from "./get";
import listMailTemplate from "./list";
import updateMailTemplate from "./update";
import deleteMailTemplate from "./delete";
import { tableInit } from "./db.table";

function createApp() {
    tableInit();
    const app = new OpenAPIHono<AppBindings>();
    const arr = [
        addMailTemplate,
        getMailTemplate,
        listMailTemplate,
        updateMailTemplate,
        deleteMailTemplate,
    ];
    arr.forEach(({ pathObj, controller, componentArr }) => {
        pathRegister(app, pathObj, controller);
        if (componentArr) {
            componentArr.forEach((component) => {
                app.openAPIRegistry.registerComponent(
                    "schemas",
                    component.name,
                    component.component,
                );
            });
        }
    });
    return app;
}

export default createApp;
