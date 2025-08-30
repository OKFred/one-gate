import nodemailer from "nodemailer";
import type { mailAccountGetResLike } from "../account/get";
import { mailSendSingleReqLike } from "./single";
export default {
  send: async (
    accountObj: mailAccountGetResLike["data"],
    receiverArr: mailSendSingleReqLike["receiverArr"],
    contentObj: mailSendSingleReqLike["contentObj"],
  ) => {
    const transporter = nodemailer.createTransport({
      host: accountObj.host,
      port: accountObj.port,
      secure: accountObj.sslEnable,
      auth: {
        user: accountObj.mailAddress,
        pass: accountObj.password,
      },
    });

    const info = await transporter.sendMail({
      from: {
        name: accountObj.nickname || accountObj.mailAddress,
        address: accountObj.mailAddress,
      },
      to: receiverArr,
      subject: contentObj.subject,
      html: contentObj.html,
    });
    return {
      accepted: info.accepted.map((address) => {
        if (typeof address === "string") {
          return { name: address, address };
        }
        return address;
      }),
      rejected: info.rejected.map((address) => {
        if (typeof address === "string") {
          return { name: address, address };
        }
        return address;
      }),
    };
  },
};
