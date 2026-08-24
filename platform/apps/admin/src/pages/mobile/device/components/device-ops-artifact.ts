/** Maximum screenshot payload accepted by the browser. */
export const OPS_MAX_ARTIFACT_BYTES = 16 * 1024 * 1024;

const OPS_MAX_ARTIFACT_HEADER_BYTES = 4 * 1024;

/** Validated screenshot metadata prepended to a binary WSS frame. */
export interface DeviceOpsArtifactHeader {
  protocolVersion: 1;
  type: 'artifact';
  sessionId: string;
  requestId: string;
  operation: 'device.screen.capture';
  artifactId: string;
  mimeType: 'image/png';
  sizeBytes: number;
  sha256: string;
  width: number;
  height: number;
  capturedAt: number;
}

/** Return true for a protocol identifier. */
function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(value);
}

/** Parse a record at the untrusted WSS boundary. */
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('OPS_ARTIFACT_HEADER_INVALID');
  }
  return value as Record<string, unknown>;
}

/** Parse one bounded screenshot frame without trusting device metadata. */
export function parseDeviceOpsArtifactFrame(
  message: ArrayBuffer,
  expectedSessionId: string,
): { header: DeviceOpsArtifactHeader; content: Uint8Array } {
  if (
    message.byteLength < 4 ||
    message.byteLength > OPS_MAX_ARTIFACT_BYTES + 4 + OPS_MAX_ARTIFACT_HEADER_BYTES
  ) {
    throw new Error('OPS_ARTIFACT_TOO_LARGE');
  }
  const bytes = new Uint8Array(message);
  const headerLength = new DataView(message).getUint32(0, false);
  if (
    headerLength <= 0 ||
    headerLength > OPS_MAX_ARTIFACT_HEADER_BYTES ||
    4 + headerLength >= message.byteLength
  ) {
    throw new Error('OPS_ARTIFACT_HEADER_INVALID');
  }
  const header = record(JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + headerLength))));
  const content = bytes.subarray(4 + headerLength);
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (
    header.protocolVersion !== 1 ||
    header.type !== 'artifact' ||
    header.sessionId !== expectedSessionId ||
    !validId(header.requestId) ||
    header.operation !== 'device.screen.capture' ||
    !validId(header.artifactId) ||
    header.mimeType !== 'image/png' ||
    !Number.isInteger(header.sizeBytes) ||
    header.sizeBytes !== content.byteLength ||
    content.byteLength <= 0 ||
    content.byteLength > OPS_MAX_ARTIFACT_BYTES ||
    typeof header.sha256 !== 'string' ||
    !/^[0-9a-f]{64}$/.test(header.sha256) ||
    !Number.isInteger(header.width) ||
    (header.width as number) <= 0 ||
    (header.width as number) > 16_384 ||
    !Number.isInteger(header.height) ||
    (header.height as number) <= 0 ||
    (header.height as number) > 16_384 ||
    typeof header.capturedAt !== 'number' ||
    !Number.isFinite(header.capturedAt) ||
    content.byteLength < pngSignature.length ||
    !pngSignature.every((byte, index) => content[index] === byte)
  ) {
    throw new Error('OPS_ARTIFACT_INVALID');
  }
  return {
    header: header as unknown as DeviceOpsArtifactHeader,
    content,
  };
}

/** Calculate a lowercase SHA-256 digest for screenshot integrity validation. */
export async function sha256Hex(content: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(content).buffer);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}
