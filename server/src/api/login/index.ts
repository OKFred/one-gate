import type { AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";
import pathRegister from "@/api/pathRegister";
import commonLogin from "./common";
import wechatLogin from "./wechat";
import verifyToken from "./verify";
import refreshToken from "./refresh";

function createApp() {
    const app = new OpenAPIHono<AppBindings>();
    const arr = [
        commonLogin,
        wechatLogin,
        verifyToken,
        refreshToken,
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
