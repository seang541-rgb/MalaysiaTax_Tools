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
  maintenanceMode?: string | undefined;
  pathname?: string | null;
}): boolean {
  if (isLocalHost(input.host)) return false;
  if (input.pathname === "/auth/callback") return false;

  const maintenanceMode = input.maintenanceMode?.trim().toLowerCase();
  if (["0", "false", "off", "no"].includes(maintenanceMode ?? "")) {
    return false;
  }

  if (["1", "true", "on", "yes"].includes(maintenanceMode ?? "")) {
    return true;
  }

  return false;
}
