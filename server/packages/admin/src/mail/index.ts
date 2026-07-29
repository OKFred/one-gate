import account from "./account/index";
import action from "./action/index";
import log from "./log/index";
import template from "./template/index";
import recipient from "./recipient/index";
import mailAccountService from "./account/service";
import mailActionService from "./action/service";
import mailLogService from "./log/service";
import mailTemplateService from "./template/service";
import mailRecipientService from "./recipient/service";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

function createApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/account", account());
  app.route("/action", action());
  app.route("/log", log());
  app.route("/template", template());
  app.route("/recipient", recipient());
  return app;
}

export const mailRegister = {
  account: mailAccountService,
  action: mailActionService,
  log: mailLogService,
  template: mailTemplateService,
  recipient: mailRecipientService,
  send: mailActionService.send,
};

export default createApp;
