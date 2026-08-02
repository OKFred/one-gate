import encapsulation from "@hodor/core/middleware/encapsulation";
import { apis } from "./service.js";
import type { BusinessKey } from "@hodor/core/types/business";

export default function route() {
  return encapsulation(
    {
      "sys/list": apis.sysList,
      "audit/list": apis.auditList,
      "biz/list": apis.bizList,
      "http/list": apis.httpList,
      timeline: apis.timeline,
    },
    "admin.base.log" satisfies BusinessKey
  );
}
