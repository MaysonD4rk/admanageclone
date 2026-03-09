/**
 * Prisma mock for unit tests.
 * Prevents real DB connections during testing.
 *
 * Usage: import this file at the top of your test file
 *   jest.mock('@/lib/db', () => ({ prisma: prismaMock }))
 */
export const prismaMock = {
  smartAsset: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  project: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  ad: {
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  generatedImage: {
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
}

/** Reset all mocks between tests */
export function resetPrismaMocks() {
  Object.values(prismaMock).forEach((model) => {
    Object.values(model).forEach((fn) => (fn as jest.Mock).mockReset())
  })
}
