import { purgeExpiredDepartments as purgeExpired } from "./repository";
import { invalidateAuthCache } from "@hodor/core/middleware/auth/cache-invalidation";

export async function purgeExpiredDepartments(
  params: Parameters<typeof purgeExpired>[0]
) {
  const result = await purgeExpired(params);
  if (result.deletedCount > 0) await invalidateAuthCache();
  return result;
}
export {
  listDeletedDepartments,
  restoreDeletedDepartment,
  purgeDeletedDepartment,
} from "./service";
