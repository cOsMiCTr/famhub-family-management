import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create demo family
  const family = await prisma.family.upsert({
    where: { id: 'demo-family-1' },
    update: {},
    create: {
      id: 'demo-family-1',
      name: 'Baki Family',
    },
  })

  // Create members
  const adminMember = await prisma.member.upsert({
    where: { email: 'onur@baki.de' },
    update: {},
    create: {
      email: 'onur@baki.de',
      name: 'Onur Baki',
      role: 'ADMIN',
      familyId: family.id,
    },
  })

  const plannerMember = await prisma.member.upsert({
    where: { email: 'tugba@baki.de' },
    update: {},
    create: {
      email: 'tugba@baki.de',
      name: 'Tugba Baki',
      role: 'PLANNER',
      familyId: family.id,
    },
  })

  // Create providers
  const eonProvider = await prisma.provider.upsert({
    where: { id: 'provider-eon' },
    update: {},
    create: {
      id: 'provider-eon',
      name: 'E.ON',
      category: 'ENERGY',
      logoUrl: 'https://logo.clearbit.com/eon.de',
      supportChannels: {
        phone: '+49 800 2050 2050',
        email: 'service@eon.de',
        web: 'https://www.eon.de',
        address: 'E.ON Energie Deutschland GmbH, 40472 Düsseldorf'
      },
    },
  })

  const telekomProvider = await prisma.provider.upsert({
    where: { id: 'provider-telekom' },
    update: {},
    create: {
      id: 'provider-telekom',
      name: 'Telekom',
      category: 'TELECOM',
      logoUrl: 'https://logo.clearbit.com/telekom.de',
      supportChannels: {
        phone: '+49 800 330 1000',
        email: 'service@telekom.de',
        web: 'https://www.telekom.de',
        address: 'Deutsche Telekom AG, 53113 Bonn'
      },
    },
  })

  const netflixProvider = await prisma.provider.upsert({
    where: { id: 'provider-netflix' },
    update: {},
    create: {
      id: 'provider-netflix',
      name: 'Netflix',
      category: 'STREAMING',
      logoUrl: 'https://logo.clearbit.com/netflix.com',
      supportChannels: {
        phone: '+1 866 579 7172',
        email: 'support@netflix.com',
        web: 'https://help.netflix.com',
        address: 'Netflix, Inc., 100 Winchester Circle, Los Gatos, CA 95032'
      },
    },
  })

  // Create contracts
  const stromContract = await prisma.contract.upsert({
    where: { id: 'contract-strom-1' },
    update: {},
    create: {
      id: 'contract-strom-1',
      familyId: family.id,
      providerId: eonProvider.id,
      title: 'Strom Basic',
      customerNumber: 'EON-1122',
      status: 'ACTIVE',
      startDate: new Date('2023-11-01'),
      endDate: null,
      minTermMonths: 12,
      cancelNoticeMonths: 1,
      renewalIntervalMonths: 12,
      nextRenewalDate: new Date('2024-11-01'),
      paymentInterval: 'MONTHLY',
      paymentMethod: 'SEPA',
      assignedMemberId: adminMember.id,
      notes: 'Preisbindung 12M',
    },
  })

  const netflixContract = await prisma.contract.upsert({
    where: { id: 'contract-netflix-1' },
    update: {},
    create: {
      id: 'contract-netflix-1',
      familyId: family.id,
      providerId: netflixProvider.id,
      title: 'Premium',
      customerNumber: 'NET-9988',
      status: 'ACTIVE',
      startDate: new Date('2024-02-01'),
      endDate: null,
      minTermMonths: 0,
      cancelNoticeMonths: 0,
      renewalIntervalMonths: 1,
      nextRenewalDate: new Date('2024-11-01'),
      paymentInterval: 'MONTHLY',
      paymentMethod: 'CARD',
      assignedMemberId: plannerMember.id,
      notes: '4K',
    },
  })

  // Create contract costs
  await prisma.contractCost.upsert({
    where: { id: 'cost-strom-1' },
    update: {},
    create: {
      id: 'cost-strom-1',
      contractId: stromContract.id,
      amountCents: 12000, // 120.00 EUR
      currency: 'EUR',
      vatRate: 19.0,
      validFrom: new Date('2023-11-01'),
      validTo: null,
    },
  })

  await prisma.contractCost.upsert({
    where: { id: 'cost-netflix-1' },
    update: {},
    create: {
      id: 'cost-netflix-1',
      contractId: netflixContract.id,
      amountCents: 1799, // 17.99 EUR
      currency: 'EUR',
      vatRate: 19.0,
      validFrom: new Date('2024-02-01'),
      validTo: null,
    },
  })

  // Create fixed cost (Rundfunk)
  await prisma.fixedCost.upsert({
    where: { id: 'fixed-rundfunk-1' },
    update: {},
    create: {
      id: 'fixed-rundfunk-1',
      familyId: family.id,
      title: 'Rundfunkbeitrag',
      category: 'Gebühren',
      amountCents: 1855, // 18.55 EUR
      currency: 'EUR',
      interval: 'MONTHLY',
      dueDay: 1,
      assignedMemberId: adminMember.id,
      notes: 'Öffentlich-rechtliche Rundfunkanstalten',
    },
  })

  // Create asset (DHH Bad Bramstedt)
  const asset = await prisma.asset.upsert({
    where: { id: 'asset-haus-1' },
    update: {},
    create: {
      id: 'asset-haus-1',
      familyId: family.id,
      type: 'REAL_ESTATE',
      name: 'DHH Bad Bramstedt',
      address: 'Musterstraße 123, 24576 Bad Bramstedt',
      purchaseDate: new Date('2020-03-15'),
      purchasePriceCents: 45000000, // 450,000 EUR
      currentValueCents: 52000000, // 520,000 EUR
      notes: 'Doppelhaushälfte, 120qm, Garten',
    },
  })

  // Create loan (Hypothek)
  await prisma.loan.upsert({
    where: { id: 'loan-hypothek-1' },
    update: {},
    create: {
      id: 'loan-hypothek-1',
      familyId: family.id,
      assetId: asset.id,
      lender: 'Sparkasse Bad Bramstedt',
      loanType: 'MORTGAGE',
      principalCents: 36000000, // 360,000 EUR
      interestRatePct: 1.2,
      startDate: new Date('2020-03-15'),
      endDate: new Date('2050-03-15'),
      installmentCents: 120000, // 1,200 EUR
      paymentInterval: 'MONTHLY',
      customerNumber: 'SPK-123456',
      notes: 'Annuitätendarlehen, 30 Jahre',
    },
  })

  // Create reminder
  await prisma.reminder.upsert({
    where: { id: 'reminder-strom-1' },
    update: {},
    create: {
      id: 'reminder-strom-1',
      familyId: family.id,
      subject: 'Stromvertrag Kündigung möglich',
      dueDate: new Date('2024-10-01'),
      relatedType: 'CONTRACT',
      relatedId: stromContract.id,
      rule: { offsetsDays: [60, 30, 7, 1] },
      channels: { push: true, email: true },
      status: 'SCHEDULED',
    },
  })

  console.log('✅ Seed completed successfully!')
  console.log(`Created family: ${family.name}`)
  console.log(`Created members: ${adminMember.name}, ${plannerMember.name}`)
  console.log(`Created providers: ${eonProvider.name}, ${telekomProvider.name}, ${netflixProvider.name}`)
  console.log(`Created contracts: ${stromContract.title}, ${netflixContract.title}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
