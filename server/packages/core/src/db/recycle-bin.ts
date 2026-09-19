import type { UserObj } from "../types/app";
import type { SoftDeleteCleanupAdapter } from "./soft-delete";

// Unlike $, this end assertion also rejects a trailing line terminator.
export const RECYCLE_BIN_RESOURCE_TYPE_PATTERN =
  "^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*(?![\\s\\S])";
export const RECYCLE_BIN_RESOURCE_TYPE_MAX_LENGTH = 64;

const resourceTypePattern = new RegExp(RECYCLE_BIN_RESOURCE_TYPE_PATTERN);

export function isRecycleBinResourceType(value: string): boolean {
  return (
    value.length <= RECYCLE_BIN_RESOURCE_TYPE_MAX_LENGTH &&
    resourceTypePattern.test(value)
  );
}

export type RecycleBinRecordId = number | string;
export type RecycleBinAction = "read" | "restore" | "purge";

/** Public summaries contain no business payload or serialized record snapshot. */
export interface RecycleBinItem {
  id: RecycleBinRecordId;
  name: string;
  deleterId: number | null;
  deleterName: string | null;
  deletedTimeUtc: number;
  expiresTimeUtc: number;
  /** Record eligibility, independent of the current actor's restore permission. */
  canRestore: boolean;
}

export interface RecycleBinListQuery {
  keyword?: string;
  pageNo: number;
  pageSize: number;
}

export interface RecycleBinMutation {
  id: RecycleBinRecordId;
  expectedDeletedTimeUtc: number;
}

/** A receipt identifies one successful deletion, never a transferable permission. */
export interface SoftDeleteUndoReceipt {
  resourceType: string;
  id: RecycleBinRecordId;
  expectedDeletedTimeUtc: number;
  undoExpiresTimeUtc: number;
  serverTimeUtc: number;
}

export const RecycleBinUndoError = {
  EXPIRED: "errorHandler.recycleBin.undoExpired",
  FORBIDDEN: "errorHandler.recycleBin.undoForbidden",
  UNSUPPORTED: "errorHandler.recycleBin.undoUnsupported",
} as const;

export interface RecycleBinResourceAdapter {
  readonly resourceType: string;
  readonly labelKey: string;
  /** Business authorization; the API separately checks recycle-bin permissions. */
  can(action: RecycleBinAction, user: UserObj): Promise<boolean>;
  /** Apply business visibility and data scope using the current actor. */
  list(
    query: RecycleBinListQuery,
    user: UserObj
  ): Promise<{ total: number; list: RecycleBinItem[] }>;
  /** Validate the business ID, actor scope, deletion version, deadline and references atomically. */
  restore(
    input: RecycleBinMutation,
    user: UserObj
  ): Promise<RecycleBinRecordId>;
  purge(input: RecycleBinMutation, user: UserObj): Promise<RecycleBinRecordId>;
  /** Requires the current business delete permission AND this deletion's actor.
   * Enforce the deletion version and short deadline in the mutating SQL.
   * This capability does not require or grant recycle-bin restore permissions.
   */
  undo?(input: RecycleBinMutation, user: UserObj): Promise<RecycleBinRecordId>;
  purgeExpired: SoftDeleteCleanupAdapter["purgeExpired"];
}

/** Only the application composition root registers supported logical resources. */
export class RecycleBinRegistry {
  private readonly adapters = new Map<string, RecycleBinResourceAdapter>();

  register(adapter: RecycleBinResourceAdapter): void {
    if (!isRecycleBinResourceType(adapter.resourceType)) {
      throw new Error("Invalid recycle-bin resource type");
    }
    const existing = this.adapters.get(adapter.resourceType);
    if (existing && existing !== adapter) {
      throw new Error("Conflicting recycle-bin resource registration");
    }
    this.adapters.set(adapter.resourceType, adapter);
  }

  get(resourceType: string): RecycleBinResourceAdapter | undefined {
    return isRecycleBinResourceType(resourceType)
      ? this.adapters.get(resourceType)
      : undefined;
  }

  list(): readonly RecycleBinResourceAdapter[] {
    return [...this.adapters.values()];
  }
}

export const recycleBinRegistry = new RecycleBinRegistry();
