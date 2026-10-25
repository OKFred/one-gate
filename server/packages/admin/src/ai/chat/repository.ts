import { registry } from "../../common/registry";

/** Read every enabled configuration; the management list is paginated. */
export async function listEnabledChatConfigurations() {
  const firstPage = await registry.base.sysConfig.list({
    namespace: "ai",
    isEnabled: true,
    orderBy: "id",
    descend: false,
    pageNo: 1,
    pageSize: 1000,
  });
  const rows = [...firstPage.list];
  for (let pageNo = 2; rows.length < firstPage.total; pageNo++) {
    const page = await registry.base.sysConfig.list({
      namespace: "ai",
      isEnabled: true,
      orderBy: "id",
      descend: false,
      pageNo,
      pageSize: 1000,
    });
    if (page.list.length === 0) break;
    rows.push(...page.list);
  }
  return rows;
}
