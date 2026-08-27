import { NextResponse, NextRequest } from 'next/server';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import os from 'os';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const token = request.cookies.get('admin_session')?.value;
    const session = verifyAdminSession(token);
    if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'OWNER'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Collect Real OS & Hardware Metrics
    const cpus = os.cpus() || [];
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePct = totalMem > 0 ? (usedMem / totalMem) * 100 : 0;

    const memUsage = process.memoryUsage();
    const heapUsedPct = memUsage.heapTotal > 0 ? (memUsage.heapUsed / memUsage.heapTotal) * 100 : 0;

    // Load Average (1, 5, 15 minutes)
    const loadAvg = os.loadavg();

    // CPU Per-Core Breakdown
    const coreDetails = cpus.map((core, index) => {
      const totalTick = Object.values(core.times).reduce((acc, tv) => acc + tv, 0);
      const idleTick = core.times.idle;
      const usagePct = totalTick > 0 ? Math.max(0, Math.min(100, Math.round(((totalTick - idleTick) / totalTick) * 100))) : 0;
      return {
        coreIndex: index + 1,
        model: core.model,
        speedMhz: core.speed,
        times: core.times,
        usagePct,
      };
    });

    // Network Interfaces
    const rawNet = os.networkInterfaces();
    const netInterfaces: Array<{ name: string; address: string; family: string; mac: string; internal: boolean }> = [];
    Object.entries(rawNet).forEach(([ifaceName, ifaceList]) => {
      if (ifaceList) {
        ifaceList.forEach((iface) => {
          netInterfaces.push({
            name: ifaceName,
            address: iface.address,
            family: iface.family,
            mac: iface.mac,
            internal: iface.internal,
          });
        });
      }
    });

    // Overall Server Health Calculation
    let healthStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL' = 'EXCELLENT';
    if (memUsagePct > 90 || (loadAvg[0] > cpus.length * 1.5 && cpus.length > 0)) {
      healthStatus = 'CRITICAL';
    } else if (memUsagePct > 75 || (loadAvg[0] > cpus.length && cpus.length > 0)) {
      healthStatus = 'WARNING';
    } else if (memUsagePct > 50) {
      healthStatus = 'GOOD';
    }

    const metrics = {
      timestamp: new Date().toISOString(),
      health: {
        status: healthStatus,
        healthScore: Math.max(20, Math.round(100 - (memUsagePct * 0.4 + (loadAvg[0] / Math.max(1, cpus.length)) * 20))),
      },
      system: {
        platform: os.platform(),
        type: os.type(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        endianness: os.endianness(),
      },
      cpu: {
        coresCount: cpus.length,
        model: cpus[0]?.model || 'Standard Server Processor',
        baseSpeedMhz: cpus[0]?.speed || 0,
        loadAvg,
        load1MinPct: cpus.length > 0 ? Math.min(100, Math.round((loadAvg[0] / cpus.length) * 100)) : 0,
        cores: coreDetails,
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercentage: memUsagePct,
      },
      process: {
        pid: process.pid,
        title: process.title,
        uptime: process.uptime(),
        nodeVersion: process.version,
        v8Version: process.versions.v8,
        architecture: process.arch,
        memoryUsage: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          heapUsagePct: heapUsedPct,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers,
        },
      },
      network: {
        interfaceCount: netInterfaces.length,
        interfaces: netInterfaces.slice(0, 8),
      },
    };

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Server Usage API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
