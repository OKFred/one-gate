import { recycleBinRegistry } from "@hodor/core/db/recycle-bin.js";
import { departmentRecycleBinAdapter } from "@hodor/admin/system/department/facade.js";

// Compose resource adapters once for HTTP and cold scheduled entry points alike.
// Adding a resource here also enrolls it in the shared retention scheduler.
recycleBinRegistry.register(departmentRecycleBinAdapter);

export { recycleBinRegistry };
