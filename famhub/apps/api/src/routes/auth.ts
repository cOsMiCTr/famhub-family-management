import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../index';

const SignupSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.String({ minLength: 2 }),
  familyName: Type.String({ minLength: 2 }),
});

const LoginSchema = Type.Object({
  email: Type.String({ format: 'email' }),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Signup
  fastify.post('/signup', {
    schema: {
      body: SignupSchema,
      response: {
        200: Type.Object({
          message: Type.String(),
          user: Type.Object({
            id: Type.String(),
            email: Type.String(),
            name: Type.String(),
            role: Type.String(),
            familyId: Type.String(),
          }),
          token: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { email, name, familyName } = request.body as any;

    // Check if user already exists
    const existingUser = await prisma.member.findUnique({
      where: { email },
    });

    if (existingUser) {
      return reply.status(409).send({
        code: 'USER_EXISTS',
        message: 'User with this email already exists',
      });
    }

    // Create family
    const family = await prisma.family.create({
      data: {
        name: familyName,
      },
    });

    // Create user as admin
    const user = await prisma.member.create({
      data: {
        email,
        name,
        familyId: family.id,
        role: 'ADMIN',
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, familyId: user.familyId },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    return {
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        familyId: user.familyId,
      },
      token,
    };
  });

  // Login
  fastify.post('/login', {
    schema: {
      body: LoginSchema,
      response: {
        200: Type.Object({
          message: Type.String(),
          user: Type.Object({
            id: Type.String(),
            email: Type.String(),
            name: Type.String(),
            role: Type.String(),
            familyId: Type.String(),
          }),
          token: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { email } = request.body as any;

    // Find user
    const user = await prisma.member.findUnique({
      where: { email },
    });

    if (!user) {
      return reply.status(404).send({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, familyId: user.familyId },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        familyId: user.familyId,
      },
      token,
    };
  });

  // Invite family member
  fastify.post('/invite', {
    schema: {
      body: Type.Object({
        email: Type.String({ format: 'email' }),
        name: Type.String({ minLength: 2 }),
        role: Type.Union([
          Type.Literal('PLANNER'),
          Type.Literal('VIEWER'),
        ]),
      }),
      response: {
        200: Type.Object({
          message: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { email, name, role } = request.body as any;
    const user = (request as any).user;

    // Check if user already exists
    const existingUser = await prisma.member.findUnique({
      where: { email },
    });

    if (existingUser) {
      return reply.status(409).send({
        code: 'USER_EXISTS',
        message: 'User with this email already exists',
      });
    }

    // Create new family member
    await prisma.member.create({
      data: {
        email,
        name,
        familyId: user.familyId,
        role,
      },
    });

    // TODO: Send invitation email

    return {
      message: 'Family member invited successfully',
    };
  });
}
