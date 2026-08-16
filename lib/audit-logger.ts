import { db } from './db';

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string; // e.g. "CREATE_TOURNAMENT", "VERIFY_PAYMENT", "BAN_USER", "UPDATE_ROOM_CREDENTIALS"
  details: string;
  timestamp: string;
  ipAddress: string;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [
    {
      id: 'log_101',
      adminId: 'usr_admin',
      adminEmail: 'admin@helian.gg',
      action: 'LOGIN_SUCCESS',
      details: 'Super Admin logged in from 192.168.1.1',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      ipAddress: '192.168.1.1',
    },
    {
      id: 'log_102',
      adminId: 'usr_admin',
      adminEmail: 'admin@helian.gg',
      action: 'UPDATE_ROOM_CREDENTIALS',
      details: 'Published Room ID [7789123] for BR Squad Championship #42',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      ipAddress: '192.168.1.1',
    },
  ];

  getLogs(): AuditLogEntry[] {
    return this.logs;
  }

  logAction(action: string, details: string) {
    const currentUser = db.getCurrentUser();
    const newEntry: AuditLogEntry = {
      id: `log_${Date.now()}`,
      adminId: currentUser?.id || 'sys_admin',
      adminEmail: currentUser?.email || 'admin@helian.gg',
      action,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.68.101',
    };
    this.logs.unshift(newEntry);
  }
}

export const auditLogger = new AuditLogger();
