export const deleteUndo = {
  'deleteUndo.record': 'Record {{id}}',
  'deleteUndo.deleted': 'Deleted “{{name}}”.',
  'deleteUndo.action': 'Undo deletion',
  'deleteUndo.undoing': 'Undoing…',
  'deleteUndo.retry': 'Retry',
  'deleteUndo.remaining': '{{seconds}}s remaining',
  'deleteUndo.submitting':
    'Waiting for the result. The request may finish after the undo window closes.',
  'deleteUndo.succeeded': 'Deletion undone for “{{name}}”.',
  'deleteUndo.failure': 'Could not undo deletion of “{{name}}”: {{reason}}',
  'deleteUndo.failed': 'The request was rejected.',
  'deleteUndo.unknown':
    'The undo result for “{{name}}” is unknown. The request may have completed.',
  'deleteUndo.deleteUnknown':
    'The deletion result for “{{name}}” is unknown. Refresh to check its current state.',
  'deleteUndo.deleteFailure': 'Could not delete “{{name}}”: {{reason}}',
  'deleteUndo.available':
    '“{{name}}” is currently available. This request’s outcome could not be confirmed.',
  'deleteUndo.changed':
    'The state of “{{name}}” has changed. This deletion can no longer be undone here.',
  'deleteUndo.forbidden': 'You are no longer allowed to undo this deletion of “{{name}}”.',
  'deleteUndo.expired': 'The undo window for “{{name}}” has ended.',
  'deleteUndo.refreshFailed':
    'The list could not be refreshed. Refresh to check its current state.',
  'deleteUndo.refreshing': 'Refreshing the list…',
  'deleteUndo.recycleHelp': 'You can check the record in the recycle bin.',
  'deleteUndo.contactAdmin': 'Contact an administrator if you need help recovering this record.',
  'deleteUndo.openRecycleBin': 'Open recycle bin',
  'deleteUndo.listFailed': 'The list could not be loaded.',
  'deleteUndo.reloadDepartmentList': 'Reload department list',
} as const satisfies Record<string, string>;
