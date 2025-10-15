import type { AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";
import pathRegister from "@/api/pathRegister";
import { createCrudOperations, type CrudConfig } from "../crudFactory";
import {
    mailLogData,
    mailLogIndex,
    mailLogUnique,
    mailLogTimestamp,
    tableInit,
} from "./db.table";
import { mailLogServiceAdapter } from "./service.adapter";

function createApp() {
    tableInit();
    const app = new OpenAPIHono<AppBindings>();

    // 配置CRUD操作
    const crudConfig: CrudConfig = {
        entityName: "mailLog",
        entityDisplayName: "邮件日志",
        schemas: {
            index: mailLogIndex,
            data: mailLogData,
            unique: mailLogUnique,
            timestamp: mailLogTimestamp,
        },
        service: mailLogServiceAdapter,
        validation: {
            addRequired: ["mailTo", "mailFrom", "title", "sendStatus"],
            getOneOf: [{ required: ["id"] }],
            updateRequired: ["id"],
            deleteRequired: ["id"],
        },
    };

    // 生成CRUD操作
    const { operations } = createCrudOperations(crudConfig);

    // 注册CRUD操作
    const crudOperations = [
        operations.add,
        operations.get,
        operations.list,
        operations.update,
        operations.delete,
    ];

    crudOperations.forEach(({ pathObj, controller, componentArr }) => {
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
