import type { AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";
import pathRegister from "@/api/pathRegister";
import addUser from "./add";
import getUser from "./get";
import listUser from "./list";
import updateUser from "./update";
import deleteUser from "./delete";
import { tableInit } from "./db.table";

function createApp() {
    tableInit();
    const app = new OpenAPIHono<AppBindings>();
    const arr = [
        addUser,
        getUser,
        listUser,
        updateUser,
        deleteUser,
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
