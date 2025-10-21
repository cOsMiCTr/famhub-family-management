import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
})

async function registerPlugins() {
  // Register plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Disable for development
  })

  await fastify.register(cors, {
    origin: process.env.WEB_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })

  await fastify.register(multipart)
}

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// API routes
fastify.register(async function (fastify) {
  // Auth routes
  fastify.post('/api/auth/signup', async (request, reply) => {
    return { message: 'Signup endpoint - to be implemented' }
  })

  fastify.post('/api/auth/login', async (request, reply) => {
    return { message: 'Login endpoint - to be implemented' }
  })

  fastify.post('/api/auth/invite', async (request, reply) => {
    return { message: 'Invite endpoint - to be implemented' }
  })

  // Family routes
  fastify.get('/api/families', async (request, reply) => {
    const families = await prisma.family.findMany({
      include: {
        members: true,
        _count: {
          select: {
            contracts: true,
            fixedCosts: true,
            assets: true,
            loans: true,
          },
        },
      },
    })
    return families
  })

  fastify.post('/api/families', async (request, reply) => {
    return { message: 'Create family endpoint - to be implemented' }
  })

  // Contract routes
  fastify.get('/api/contracts', async (request, reply) => {
    const contracts = await prisma.contract.findMany({
      include: {
        provider: true,
        assignedMember: true,
        costs: true,
        _count: {
          select: {
            attachments: true,
          },
        },
      },
    })
    return contracts
  })

  fastify.post('/api/contracts', async (request, reply) => {
    return { message: 'Create contract endpoint - to be implemented' }
  })

  // Fixed costs routes
  fastify.get('/api/fixed-costs', async (request, reply) => {
    const fixedCosts = await prisma.fixedCost.findMany({
      include: {
        assignedMember: true,
        asset: true,
      },
    })
    return fixedCosts
  })

  // Assets routes
  fastify.get('/api/assets', async (request, reply) => {
    const assets = await prisma.asset.findMany({
      include: {
        contracts: true,
        loans: true,
        _count: {
          select: {
            attachments: true,
          },
        },
      },
    })
    return assets
  })

  // Loans routes
  fastify.get('/api/loans', async (request, reply) => {
    const loans = await prisma.loan.findMany({
      include: {
        asset: true,
        _count: {
          select: {
            attachments: true,
          },
        },
      },
    })
    return loans
  })

  // Dashboard route
  fastify.get('/api/dashboard', async (request, reply) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get active contracts with current costs
    const activeContracts = await prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        costs: {
          some: {
            validFrom: { lte: now },
            OR: [
              { validTo: null },
              { validTo: { gte: now } },
            ],
          },
        },
      },
      include: {
        costs: {
          where: {
            validFrom: { lte: now },
            OR: [
              { validTo: null },
              { validTo: { gte: now } },
            ],
          },
        },
      },
    })

    // Get monthly fixed costs
    const monthlyFixedCosts = await prisma.fixedCost.findMany({
      where: {
        interval: 'MONTHLY',
      },
    })

    // Calculate monthly totals
    let monthlyTotalCents = 0

    // Add contract costs (normalize to monthly)
    for (const contract of activeContracts) {
      for (const cost of contract.costs) {
        let monthlyAmount = cost.amountCents
        if (contract.paymentInterval === 'ANNUAL') {
          monthlyAmount = Math.round(cost.amountCents / 12)
        } else if (contract.paymentInterval === 'QUARTERLY') {
          monthlyAmount = Math.round(cost.amountCents / 3)
        } else if (contract.paymentInterval === 'SEMIANNUAL') {
          monthlyAmount = Math.round(cost.amountCents / 6)
        }
        monthlyTotalCents += monthlyAmount
      }
    }

    // Add fixed costs
    for (const fixedCost of monthlyFixedCosts) {
      monthlyTotalCents += fixedCost.amountCents
    }

    // Get upcoming renewals (next 30 days)
    const upcomingRenewals = await prisma.contract.findMany({
      where: {
        nextRenewalDate: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        provider: true,
        assignedMember: true,
      },
    })

    return {
      monthlyTotalCents,
      monthlyTotal: (monthlyTotalCents / 100).toFixed(2),
      currency: 'EUR',
      activeContractsCount: activeContracts.length,
      upcomingRenewalsCount: upcomingRenewals.length,
      upcomingRenewals,
    }
  })

}, { prefix: '' })

// Catch-all route for SPA
fastify.get('*', async (request, reply) => {
  return reply.sendFile('index.html', path.join(__dirname, '../../web/dist'))
})

const start = async () => {
  try {
    await registerPlugins()
    
    // Serve static files from web app
    await fastify.register(staticFiles, {
      root: path.join(__dirname, '../../web/dist'),
      prefix: '/static',
    })
    
    const port = process.env.PORT || 3001
    const host = process.env.HOST || '0.0.0.0'
    
    await fastify.listen({ port: Number(port), host })
    console.log(`🚀 Server running on http://${host}:${port}`)
  } catch (err) {
    console.error('Error starting server:', err)
    process.exit(1)
  }
}

start()
