// Audit logger — server-safe, no client-only imports

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}

// In-memory audit log (resets on cold start — acceptable for a lightweight audit trail)
class AuditLogger {
  private logs: AuditLogEntry[] = [];

  getLogs(): AuditLogEntry[] {
    return this.logs;
  }

  logAction(adminId: string, adminEmail: string, action: string, details: string, ipAddress = 'unknown') {
    const newEntry: AuditLogEntry = {
      id: `log_${Date.now()}`,
      adminId,
      adminEmail,
      action,
      details,
      timestamp: new Date().toISOString(),
      ipAddress,
    };
    this.logs.unshift(newEntry);
  }
}

export const auditLogger = new AuditLogger();
