import encapsulation from "@hodor/core/middleware/encapsulation";
import service from "./service";

const router = () => {
  return encapsulation(service, "admin.ai.config");
};

export default router;
