import type { AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";
import pathRegister from "@/api/pathRegister";
import addMailAccount from "./add";
import getMailAccount from "./get";
import listMailAccount from "./list";
import updateMailAccount from "./update";
import deleteMailAccount from "./delete";
import verifyMailAccount from "./verify";
import { tableInit } from "./db.table";

function createApp() {
    tableInit();
    const app = new OpenAPIHono<AppBindings>();
    const arr = [
        addMailAccount,
        getMailAccount,
        listMailAccount,
        updateMailAccount,
        deleteMailAccount,
        verifyMailAccount,
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
