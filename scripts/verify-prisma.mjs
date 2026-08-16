import { prisma } from '../lib/prisma.ts';

async function main() {
  try {
    await prisma.$connect();
    const count = await prisma.tournament.count();
    const created = await prisma.tournament.create({
      data: {
        title: 'Verification Tournament',
        description: 'Created from verification script',
        mode: 'SQUAD',
        format: 'BR_RANKED',
        entryFee: 100,
        prizePool: 1000,
        firstPrize: 500,
        secondPrize: 250,
        thirdPrize: 100,
        maxTeams: 20,
        matchTime: new Date(),
        registrationDeadline: new Date(),
        rules: 'Verification rules',
      },
    });
    console.log(JSON.stringify({ count, createdId: created.id }, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
