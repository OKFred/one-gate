export { MobileOpsSession } from "./mobile-ops-session.js";
export { TotpGateCoordinator } from "./totp-gate-coordinator.js";

/** Deploy explicitly for the department migration; replace with the normal Worker to reopen. */
export default {
  fetch(_request: Request, _env: Env, _ctx: ExecutionContext): Response {
    return new Response("Service temporarily unavailable for maintenance.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": "60",
        "Cache-Control": "no-store",
        "X-Hodor-Maintenance": "department-soft-delete",
      },
    });
  },

  scheduled(
    _event: ScheduledController,
    _env: Env,
    _ctx: ExecutionContext
  ): void {
    // Keep minute triggers installed without starting application jobs or retention cleanup.
  },
} satisfies ExportedHandler<Env>;
