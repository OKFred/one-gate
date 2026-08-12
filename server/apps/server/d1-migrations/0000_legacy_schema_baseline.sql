-- Transition marker for databases reconciled from the legacy replay runner.
-- New schema changes must be appended as immutable Wrangler D1 migrations.
SELECT 1 AS legacy_schema_baseline;
