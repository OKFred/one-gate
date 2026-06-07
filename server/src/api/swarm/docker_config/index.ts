import encapsulation from "@/middleware/encapsulation";
import service from "./service";
import type { BusinessKey } from "@/types/business";

function createApp() {
  return encapsulation(service, "swarm.docker_config" satisfies BusinessKey);
}

export default createApp;
