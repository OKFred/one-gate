import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";

export const AssetError = {
  NOT_VISIBLE: "errorHandler.enterprise.asset.notVisible",
  STATE_CONFLICT: "errorHandler.enterprise.asset.stateConflict",
  CODE_CONFLICT: "errorHandler.enterprise.asset.codeConflict",
  IDENTIFIER_CONFLICT: "errorHandler.enterprise.asset.identifierConflict",
  INVALID_IDENTIFIER: "errorHandler.enterprise.asset.invalidIdentifier",
  INVALID_INTERVAL: "errorHandler.enterprise.asset.invalidInterval",
  AMBIGUOUS_MAPPING: "errorHandler.enterprise.asset.ambiguousMapping",
} as const;

function databaseMessages(error: unknown): string {
  const messages: string[] = [];
  let current = error;
  for (let depth = 0; depth < 8 && current instanceof Error; depth += 1) {
    messages.push(current.message);
    current = current.cause;
  }
  return messages.join("\n");
}

/** Only used around our guarded batches, whose sole JSON expression is the CAS assertion. */
export async function guardedAssetWrite<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = databaseMessages(error);
    if (/malformed json/i.test(message))
      throw new BusinessError(AssetError.STATE_CONFLICT);
    if (/unique constraint failed/i.test(message)) {
      if (
        message.includes("enterprise_asset_identifier.tenant_id") ||
        message.includes("enterprise_asset_identifier_verified_unique")
      ) {
        throw new BusinessError(AssetError.IDENTIFIER_CONFLICT);
      }
      if (
        message.includes(
          "enterprise_asset.tenant_id, enterprise_asset.asset_code"
        ) ||
        message.includes("enterprise_asset_tenant_code_unique")
      ) {
        throw new BusinessError(AssetError.CODE_CONFLICT);
      }
    }
    throw error;
  }
}
