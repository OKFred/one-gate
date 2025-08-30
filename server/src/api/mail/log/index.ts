import type { AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";
import pathRegister from "@/api/pathRegister";
import addMailLog from "./add";
import getMailLog from "./get";
import listMailLog from "./list";
import updateMailLog from "./update";
import deleteMailLog from "./delete";
import { tableInit } from "./db.table";

function createApp() {
    tableInit();
    const app = new OpenAPIHono<AppBindings>();
    const arr = [
        addMailLog,
        getMailLog,
        listMailLog,
        updateMailLog,
        deleteMailLog,
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
