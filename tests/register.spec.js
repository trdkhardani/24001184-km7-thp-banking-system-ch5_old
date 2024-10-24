import request from 'supertest';
import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import app from '../index.js';

const mockPrisma = {
  user: {
    create: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

jest.spyOn(bcrypt, 'hash');

beforeEach(() => {
  jest.clearAllMocks(); // Clear all mocks between tests
  mockPrisma.user.create.mockReset(); // Reset specific Prisma mocks
});

describe('POST /api/v1/auth/register', () => {
  const mockUser = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    identity_type: 'Silver',
    identity_number: '123456789',
    address: '123 Test Street',
  };

  it('should register a new user successfully', async () => {
    bcrypt.hash.mockResolvedValue('hashed_password'); // Mock bcrypt
    mockPrisma.user.create.mockResolvedValueOnce({
      id: 1,
      ...mockUser,
      password: 'hashed_password',
    });

    const res = await request(app).post('/api/v1/auth/register').send(mockUser);

    expect(res.statusCode).toBe(201); // Ensure correct status code
    expect(res.body.status).toBe('success'); // Validate response status
    expect(bcrypt.hash).toHaveBeenCalledWith(mockUser.password, 10); // Validate password hashing
  });

  it('should return 400 if validation fails', async () => {
    const invalidUser = { email: '' }; // Invalid input

    const res = await request(app).post('/api/v1/auth/register').send(invalidUser);

    expect(res.statusCode).toBe(400);
  });

  it('should return 409 if email is already taken', async () => {
    mockPrisma.user.create.mockRejectedValueOnce({ code: 'P2002' }); // Simulate conflict error

    const res = await request(app).post('/api/v1/auth/register').send(mockUser);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe('Email has already been taken');
  });
});
