import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo family
  const family = await prisma.family.create({
    data: {
      name: 'Baki Familie',
    },
  });

  console.log('✅ Created family:', family.name);

  // Create members
  const adminMember = await prisma.member.create({
    data: {
      familyId: family.id,
      email: 'admin@baki.de',
      name: 'Onur Baki',
      role: 'ADMIN',
    },
  });

  const plannerMember = await prisma.member.create({
    data: {
      familyId: family.id,
      email: 'planner@baki.de',
      name: 'Tugba Baki',
      role: 'PLANNER',
    },
  });

  console.log('✅ Created members:', adminMember.name, plannerMember.name);

  // Create providers
  const eonProvider = await prisma.provider.create({
    data: {
      name: 'E.ON',
      category: 'ENERGY',
      logoUrl: 'https://logo.clearbit.com/eon.de',
      supportChannels: {
        phone: '+49 800 123456',
        email: 'service@eon.de',
        web: 'https://www.eon.de',
        address: 'E.ON Energie Deutschland GmbH, 40472 Düsseldorf',
      },
    },
  });

  const telekomProvider = await prisma.provider.create({
    data: {
      name: 'Telekom',
      category: 'TELECOM',
      logoUrl: 'https://logo.clearbit.com/telekom.de',
      supportChannels: {
        phone: '+49 800 3301000',
        email: 'service@telekom.de',
        web: 'https://www.telekom.de',
        address: 'Deutsche Telekom AG, 53113 Bonn',
      },
    },
  });

  const netflixProvider = await prisma.provider.create({
    data: {
      name: 'Netflix',
      category: 'STREAMING',
      logoUrl: 'https://logo.clearbit.com/netflix.com',
      supportChannels: {
        phone: '+49 800 100 2707',
        email: 'help@netflix.com',
        web: 'https://help.netflix.com',
        address: 'Netflix International B.V., 1066 EC Amsterdam',
      },
    },
  });

  console.log('✅ Created providers:', eonProvider.name, telekomProvider.name, netflixProvider.name);

  // Create contracts
  const stromContract = await prisma.contract.create({
    data: {
      familyId: family.id,
      providerId: eonProvider.id,
      title: 'Strom Basic',
      customerNumber: 'EON-1122',
      status: 'ACTIVE',
      startDate: new Date('2023-11-01'),
      minTermMonths: 12,
      cancelNoticeMonths: 1,
      renewalIntervalMonths: 12,
      nextRenewalDate: new Date('2024-11-01'),
      paymentInterval: 'MONTHLY',
      paymentMethod: 'SEPA',
      assignedMemberId: adminMember.id,
      notes: 'Preisbindung 12M',
    },
  });

  const netflixContract = await prisma.contract.create({
    data: {
      familyId: family.id,
      providerId: netflixProvider.id,
      title: 'Premium',
      customerNumber: 'NET-9988',
      status: 'ACTIVE',
      startDate: new Date('2024-02-01'),
      minTermMonths: 0,
      cancelNoticeMonths: 0,
      renewalIntervalMonths: 1,
      nextRenewalDate: new Date('2024-11-01'),
      paymentInterval: 'MONTHLY',
      paymentMethod: 'CARD',
      assignedMemberId: plannerMember.id,
      notes: '4K',
    },
  });

  console.log('✅ Created contracts:', stromContract.title, netflixContract.title);

  // Create contract costs
  await prisma.contractCost.create({
    data: {
      contractId: stromContract.id,
      amountCents: 12000, // 120.00 EUR
      currency: 'EUR',
      vatRate: 19.0,
      validFrom: new Date('2023-11-01'),
    },
  });

  await prisma.contractCost.create({
    data: {
      contractId: netflixContract.id,
      amountCents: 1799, // 17.99 EUR
      currency: 'EUR',
      vatRate: 19.0,
      validFrom: new Date('2024-02-01'),
    },
  });

  console.log('✅ Created contract costs');

  // Create fixed cost
  const rundfunkCost = await prisma.fixedCost.create({
    data: {
      familyId: family.id,
      title: 'Rundfunkbeitrag',
      category: 'Gebühren',
      amountCents: 1888, // 18.88 EUR
      currency: 'EUR',
      interval: 'MONTHLY',
      dueDay: 15,
      assignedMemberId: adminMember.id,
      notes: 'ARD ZDF Deutschlandradio Beitragsservice',
    },
  });

  console.log('✅ Created fixed cost:', rundfunkCost.title);

  // Create asset (house)
  const houseAsset = await prisma.asset.create({
    data: {
      familyId: family.id,
      type: 'REAL_ESTATE',
      name: 'DHH Bad Bramstedt',
      address: 'Musterstraße 123, 24576 Bad Bramstedt',
      purchaseDate: new Date('2020-05-15'),
      purchasePriceCents: 35000000, // 350,000 EUR
      currentValueCents: 42000000, // 420,000 EUR
      notes: 'Doppelhaushälfte mit Garten',
    },
  });

  console.log('✅ Created asset:', houseAsset.name);

  // Create loan (mortgage)
  const mortgageLoan = await prisma.loan.create({
    data: {
      familyId: family.id,
      assetId: houseAsset.id,
      lender: 'Sparkasse Bad Bramstedt',
      loanType: 'MORTGAGE',
      principalCents: 28000000, // 280,000 EUR
      interestRatePct: 2.5,
      startDate: new Date('2020-05-15'),
      endDate: new Date('2050-05-15'),
      installmentCents: 120000, // 1,200 EUR
      paymentInterval: 'MONTHLY',
      customerNumber: 'SPK-123456',
      notes: 'Annuitätendarlehen',
    },
  });

  console.log('✅ Created loan:', mortgageLoan.loanType);

  // Create reminders
  const contractReminder = await prisma.reminder.create({
    data: {
      familyId: family.id,
      subject: 'Stromvertrag läuft aus',
      dueDate: new Date('2024-10-01'), // 30 days before renewal
      relatedType: 'CONTRACT',
      relatedId: stromContract.id,
      rule: { offsetsDays: [60, 30, 7, 1] },
      channels: { push: true, email: true },
      status: 'SCHEDULED',
    },
  });

  const fixedCostReminder = await prisma.reminder.create({
    data: {
      familyId: family.id,
      subject: 'Rundfunkbeitrag fällig',
      dueDate: new Date('2024-12-15'),
      relatedType: 'FIXED_COST',
      relatedId: rundfunkCost.id,
      rule: { offsetsDays: [7, 1] },
      channels: { push: true, email: true },
      status: 'SCHEDULED',
    },
  });

  console.log('✅ Created reminders');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
