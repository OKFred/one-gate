/** Never retain URL parser errors: they include the secret-bearing input property. */
export function parsePostgresConnection(connectionString: string): URL {
  let target: URL;
  try {
    target = new URL(connectionString);
  } catch {
    throw new Error("Invalid PostgreSQL connection configuration");
  }
  if (!["postgres:", "postgresql:"].includes(target.protocol))
    throw new Error("A PostgreSQL connection is required");
  return target;
}

/** Node connections and schema tools verify remote TLS; Hyperdrive manages its own origin TLS. */
export function verifiedPostgresConnection(
  connectionString: string,
  ca?: string
) {
  const target = parsePostgresConnection(connectionString);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
  if (local && !ca && !target.searchParams.has("sslmode"))
    return { connectionString: target.href };
  // pg-connection-string can otherwise override the explicit CA configuration.
  for (const key of [
    "sslmode",
    "sslcert",
    "sslkey",
    "sslrootcert",
    "uselibpqcompat",
  ])
    target.searchParams.delete(key);
  return {
    connectionString: target.href,
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  };
}
