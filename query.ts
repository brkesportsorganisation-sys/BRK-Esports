import { prisma } from './lib/prisma';
prisma.participant.findMany().then(res => console.log(JSON.stringify(res, null, 2))).catch(console.error).finally(() => prisma.$disconnect());
