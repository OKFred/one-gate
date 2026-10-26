export const common = {
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.save': 'Save',
  'common.submit': 'Submit',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.view': 'View',
  'common.refresh': 'Refresh',
  'common.add': 'Add',
  'common.close': 'Close',
  'common.copy': 'Copy',
  'common.all': 'All',
  'common.search': 'Search',
  'common.reset': 'Reset',
  'common.export': 'Export',
  'common.import': 'Import',
  'common.loading': 'Loading...',
  'common.submitting': 'Submitting...',
  'common.submitSuccess': 'Submitted successfully',
  'common.saveSuccess': 'Saved successfully',
  'common.deleteSuccess': 'Deleted successfully',
  'common.operateSuccess': 'Operation successful',
  'common.deleting': 'Deleting...',
  'common.saving': 'Saving',
  'common.searching': 'Searching...',
  'common.loadMore': 'Load More',
  'common.fullScreen': 'Full Screen',
  'common.exitFullScreen': 'Exit Full Screen',
  'common.collapseAll': 'Collapse All',
  'common.expandAll': 'Expand All',
  'common.confirmDelete': 'Confirm Delete',
  'common.isEnabled': 'Is Enabled',
  'common.permanent': 'Permanent',
  'common.filter': 'Filter',
  'common.results': 'results',
  'common.welcome': 'Welcome to the Management System',
  'common.welcomeSubtitle':
    'Efficient workflows and organizational management solutions at your fingertips.',

  'error.requestFailed': 'Request failed',
  'error.sessionExpired': 'Session expired, please login again',
  'error.networkError': 'Network error',
  'error.networkOrServiceUnavailable':
    'The network or service is temporarily unavailable. Try again later. If this continues, ask an administrator to check platform quotas and service status.',
  'error.serverUnavailable':
    'The service is temporarily unavailable. Try again later or contact an administrator if this continues.',
  'error.requestRateLimited':
    'Requests are too frequent. Retry manually later or contact an administrator if this continues.',
  'error.cloudflareD1DailyReadLimit':
    'Cloudflare D1 has reached its daily read quota. Try again after the quota resets at 00:00 UTC, or ask an administrator to review the plan.',
  'error.cloudflareD1DailyWriteLimit':
    'Cloudflare D1 has reached its daily write quota. Try again after the quota resets at 00:00 UTC, or ask an administrator to review the plan.',
  'error.cloudflareD1StorageLimit':
    'Cloudflare D1 has reached its storage limit. Ask an administrator to check database capacity.',
  'error.cloudflareKvQuotaExceeded':
    'Cloudflare KV has reached its quota. Ask an administrator to check usage and the plan.',
  'error.cloudflareKvRateLimited':
    'Cloudflare KV requests are rate limited. Retry manually later or contact an administrator if this continues.',
  'error.cloudflareWorkersDailyLimit':
    'Cloudflare Workers has reached its daily request quota. Try again after the quota resets, or ask an administrator to review the plan.',
  'error.cloudflareWorkersResourceLimit':
    'This Cloudflare Workers invocation exceeded its CPU or memory limit. Retry manually later or contact an administrator if this continues.',
} as const satisfies Record<string, string>;
