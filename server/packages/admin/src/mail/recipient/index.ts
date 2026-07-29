import encapsulation from "@hodor/core/middleware/encapsulation";
import service from "./service";
import * as mailRecipientRepository from "./repository";
import { BusinessKey } from "@hodor/core/types/business";

function createApp() {
  return encapsulation(service, "admin.mail.recipient" satisfies BusinessKey);
}

export { mailRecipientRepository, service as mailRecipientService };
export default createApp;
