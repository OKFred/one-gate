import type { AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";
import pathRegister from "@/api/pathRegister";
import { createCrudOperations, type CrudConfig } from "../crudFactory";
import {
    mailTemplateData,
    mailTemplateIndex,
    mailTemplateUnique,
    mailTemplateTimestamp,
    tableInit,
} from "./db.table";
import { mailTemplateServiceAdapter } from "./service.adapter";

function createApp() {
    tableInit();
    const app = new OpenAPIHono<AppBindings>();

    // 配置CRUD操作
    const crudConfig: CrudConfig = {
        entityName: "mailTemplate",
        entityDisplayName: "邮件模板",
        schemas: {
            index: mailTemplateIndex,
            data: mailTemplateData,
            unique: mailTemplateUnique,
            timestamp: mailTemplateTimestamp,
        },
        service: mailTemplateServiceAdapter,
        validation: {
            addRequired: ["name", "title", "content", "creatorName"],
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