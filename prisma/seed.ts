/**
 * Seed script: copies all initial mock tournaments into the Prisma SQLite DB.
 * Run once: npx tsx prisma/seed.ts
 */
import { prisma } from '../lib/prisma';

const tournaments = [
  {
    id: 'tour_01',
    title: 'Free Fire Grand BR Squad Championship #42',
    description: '<p>The ultimate Bermuda Clash of Champions! 48 Squads fight for survival, high kill rewards, and glory.</p>',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    mode: 'SQUAD',
    format: 'BR_RANKED',
    entryFee: 100,
    prizePool: 4000,
    firstPrize: 2000,
    secondPrize: 1000,
    thirdPrize: 500,
    perKillPrize: 10,
    maxTeams: 48,
    registeredCount: 0,
    matchTime: new Date('2026-08-04T20:30:00.000Z'),
    registrationDeadline: new Date('2026-08-04T19:30:00.000Z'),
    status: 'UPCOMING',
    roomId: '7789123',
    roomPassword: 'ff88',
    roomEnabled: true,
    isPublished: true,
    showOnHomepage: true,
    registrationOpen: true,
    rules: 'No hackers, emulator allowed for 2 slots max, screenshot mandatory after Booyah.',
  },
  {
    id: 'tour_02',
    title: 'CS 4v4 High Stakes Knockout',
    description: '<p>Fast-paced 4v4 Clash Squad action. Best of 7 rounds per match on Bermuda Remastered.</p>',
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80',
    mode: 'SQUAD',
    format: 'CS_RANKED',
    entryFee: 150,
    prizePool: 2500,
    firstPrize: 1600,
    secondPrize: 900,
    thirdPrize: 0,
    perKillPrize: 0,
    maxTeams: 16,
    registeredCount: 0,
    matchTime: new Date('2026-08-03T21:00:00.000Z'),
    registrationDeadline: new Date('2026-08-03T20:00:00.000Z'),
    status: 'LIVE',
    roomId: '8821904',
    roomPassword: 'cs99',
    roomEnabled: true,
    isPublished: true,
    showOnHomepage: true,
    registrationOpen: false,
    rules: 'Grenades allowed, Character Skills ON, Gun Attributes OFF.',
  },
  {
    id: 'tour_03',
    title: 'Solo Sniper King Showdown [FREE ENTRY]',
    description: '<p>Free entry for all solo players! AWM &amp; Kar98k sniper-only battle with 50 Diamonds reward per kill.</p>',
    banner: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200&auto=format&fit=crop&q=80',
    mode: 'SOLO',
    format: 'BR_RANKED',
    entryFee: 0,
    prizePool: 1500,
    firstPrize: 800,
    secondPrize: 400,
    thirdPrize: 300,
    perKillPrize: 5,
    maxTeams: 50,
    registeredCount: 0,
    matchTime: new Date('2026-08-05T18:00:00.000Z'),
    registrationDeadline: new Date('2026-08-05T17:00:00.000Z'),
    status: 'UPCOMING',
    roomEnabled: false,
    isPublished: true,
    showOnHomepage: true,
    registrationOpen: true,
    rules: 'Sniper rifles only. Teaming up results in instant lifetime ban.',
  },
  {
    id: 'tour_04',
    title: 'Duo Night Blitz Pro League',
    description: '<p>Team up with your best buddy for maximum synergy and fast action in Kalahari.</p>',
    banner: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=1200&auto=format&fit=crop&q=80',
    mode: 'DUO',
    format: 'BR_RANKED',
    entryFee: 50,
    prizePool: 1800,
    firstPrize: 1000,
    secondPrize: 500,
    thirdPrize: 300,
    perKillPrize: 8,
    maxTeams: 24,
    registeredCount: 0,
    matchTime: new Date('2026-08-02T22:00:00.000Z'),
    registrationDeadline: new Date('2026-08-02T21:00:00.000Z'),
    status: 'FINISHED',
    roomEnabled: false,
    isPublished: true,
    showOnHomepage: true,
    registrationOpen: false,
    rules: 'Standard Duo BR rules apply.',
  },
];

async function seed() {
  console.log('Seeding tournaments...');
  for (const t of tournaments) {
    const existing = await prisma.tournament.findUnique({ where: { id: t.id } });
    if (existing) {
      console.log(`  ✓ Skipped (already exists): ${t.title}`);
      continue;
    }
    await prisma.tournament.create({ data: t as any });
    console.log(`  ✓ Created: ${t.title}`);
  }
  console.log('Seed complete!');
  await prisma.$disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
