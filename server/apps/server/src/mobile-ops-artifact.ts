/** Maximum screenshot payload accepted from a device. */
export const OPS_MAX_ARTIFACT_BYTES = 16 * 1024 * 1024;

/** Maximum UTF-8 JSON header embedded in an artifact frame. */
export const OPS_MAX_ARTIFACT_HEADER_BYTES = 4 * 1024;

/** Validated metadata carried before an ephemeral screenshot. */
export interface MobileOpsArtifactHeader {
  protocolVersion: 1;
  type: "artifact";
  sessionId: string;
  requestId: string;
  operation: "device.screen.capture";
  artifactId: string;
  mimeType: "image/png";
  sizeBytes: number;
  sha256: string;
  width: number;
  height: number;
  capturedAt: number;
}

/** Stable parsing failure used to choose the WebSocket close code. */
export class MobileOpsArtifactError extends Error {
  /** Create a bounded artifact validation failure. */
  constructor(
    message: string,
    readonly closeCode: 1008 | 1009 = 1008
  ) {
    super(message);
  }
}

/** Return true for a protocol identifier. */
function validId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,100}$/.test(value);
}

/** Parse a record without weakening the global unknown boundary. */
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new MobileOpsArtifactError("OPS_ARTIFACT_HEADER_INVALID");
  }
  return value as Record<string, unknown>;
}

/** Parse and validate one device screenshot binary frame without retaining it. */
export function parseMobileOpsArtifactFrame(
  message: ArrayBuffer,
  expectedSessionId: string
): MobileOpsArtifactHeader {
  if (
    message.byteLength < 4 ||
    message.byteLength >
      OPS_MAX_ARTIFACT_BYTES + 4 + OPS_MAX_ARTIFACT_HEADER_BYTES
  ) {
    throw new MobileOpsArtifactError("OPS_ARTIFACT_TOO_LARGE", 1009);
  }
  const bytes = new Uint8Array(message);
  const headerLength = new DataView(message).getUint32(0, false);
  if (
    headerLength <= 0 ||
    headerLength > OPS_MAX_ARTIFACT_HEADER_BYTES ||
    4 + headerLength >= message.byteLength
  ) {
    throw new MobileOpsArtifactError("OPS_ARTIFACT_HEADER_INVALID");
  }
  let value: Record<string, unknown>;
  try {
    value = record(
      JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + headerLength)))
    );
  } catch (error) {
    if (error instanceof MobileOpsArtifactError) throw error;
    throw new MobileOpsArtifactError("OPS_ARTIFACT_HEADER_INVALID");
  }
  const payload = bytes.subarray(4 + headerLength);
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (
    value.protocolVersion !== 1 ||
    value.type !== "artifact" ||
    value.sessionId !== expectedSessionId ||
    !validId(value.requestId) ||
    value.operation !== "device.screen.capture" ||
    !validId(value.artifactId) ||
    value.mimeType !== "image/png" ||
    !Number.isInteger(value.sizeBytes) ||
    value.sizeBytes !== payload.byteLength ||
    payload.byteLength <= 0 ||
    payload.byteLength > OPS_MAX_ARTIFACT_BYTES ||
    typeof value.sha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.sha256) ||
    !Number.isInteger(value.width) ||
    (value.width as number) <= 0 ||
    (value.width as number) > 16_384 ||
    !Number.isInteger(value.height) ||
    (value.height as number) <= 0 ||
    (value.height as number) > 16_384 ||
    typeof value.capturedAt !== "number" ||
    !Number.isFinite(value.capturedAt) ||
    payload.byteLength < pngSignature.length ||
    !pngSignature.every((byte, index) => payload[index] === byte)
  ) {
    throw new MobileOpsArtifactError("OPS_ARTIFACT_INVALID");
  }
  return value as unknown as MobileOpsArtifactHeader;
}
