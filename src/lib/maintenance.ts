export function isLocalHost(host: string | null): boolean {
  if (!host) return false;

  const hostname = host.split(":")[0];
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

export function isProductionMaintenanceHost(input: {
  host: string | null;
  vercelEnv: string | undefined;
}): boolean {
  return input.vercelEnv === "production" && !isLocalHost(input.host);
}
