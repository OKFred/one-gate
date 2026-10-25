import type { FromSchema } from "json-schema-to-ts";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import type { AskReq } from "./model";
import { ErrorCodes } from "./prevention";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;

function validateImage(dataUri: string): void {
  if (dataUri.length > MAX_BASE64_LENGTH + 32) {
    throw new BusinessError(ErrorCodes.IMAGE_TOO_LARGE);
  }
  const match =
    /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUri);
  if (!match || match[2].length % 4 !== 0) {
    throw new BusinessError(ErrorCodes.IMAGE_INVALID);
  }
  const encoded = match[2];
  const size =
    (encoded.length / 4) * 3 -
    (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
  if (size > MAX_IMAGE_BYTES) {
    throw new BusinessError(ErrorCodes.IMAGE_TOO_LARGE);
  }
  let bytes: string;
  try {
    bytes = atob(encoded);
    if (btoa(bytes) !== encoded) throw new Error("Noncanonical base64");
  } catch {
    throw new BusinessError(ErrorCodes.IMAGE_INVALID);
  }
  const signature = Array.from(bytes.slice(0, 8), (byte) => byte.charCodeAt(0));
  const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (byte, index) => signature[index] === byte
  );
  const isJpeg =
    signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
  if (bytes.length === 0 || (match[1] === "image/png" ? !isPng : !isJpeg)) {
    throw new BusinessError(ErrorCodes.IMAGE_INVALID);
  }
}

/** Counts current and historic images together, including duplicate URLs. */
export function validateChatAttachments(
  params: FromSchema<typeof AskReq>
): boolean {
  const images: string[] = [];
  if (params.image !== undefined) images.push(params.image);
  for (const message of params.history ?? []) {
    if (typeof message.content === "string") continue;
    for (const part of message.content) {
      if (part.type === "image_url") images.push(part.image_url.url);
    }
  }
  if (images.length > 1) throw new BusinessError(ErrorCodes.IMAGE_LIMIT);
  for (const image of images) validateImage(image);
  return images.length === 1;
}
