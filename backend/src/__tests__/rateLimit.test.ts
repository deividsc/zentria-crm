import { describe, it, expect, vi, beforeEach } from 'vitest';

// The pipeline mock must be accessible before and after vi.mock hoisting.
// We define it at module scope and reference it inside the factory.
const mockPipeline = {
  zremrangebyscore: vi.fn().mockReturnThis(),
  zcard: vi.fn().mockReturnThis(),
  zadd: vi.fn().mockReturnThis(),
  pexpire: vi.fn().mockReturnThis(),
  exec: vi.fn(),
};

const mockRedisInstance = {
  pipeline: vi.fn(() => mockPipeline),
  zremrangebyrank: vi.fn().mockResolvedValue(1),
};

// vi.mock is hoisted — the factory runs before module-level code.
// Using vi.hoisted() ensures our objects exist before the factory runs.
const { hoistedPipeline, hoistedRedis } = vi.hoisted(() => {
  const hoistedPipeline = {
    zremrangebyscore: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    pexpire: vi.fn().mockReturnThis(),
    exec: vi.fn(),
  };
  const hoistedRedis = {
    pipeline: vi.fn(() => hoistedPipeline),
    zremrangebyrank: vi.fn().mockResolvedValue(1),
  };
  return { hoistedPipeline, hoistedRedis };
});

vi.mock('ioredis', () => ({
  default: vi.fn(() => hoistedRedis),
}));

import { checkIdentityRateLimit } from '../middleware/rateLimit.js';

describe('checkIdentityRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoistedRedis.pipeline.mockReturnValue(hoistedPipeline);
    hoistedRedis.zremrangebyrank.mockResolvedValue(1);
  });

  it('allows request when under the 5/hour limit', async () => {
    hoistedPipeline.exec.mockResolvedValue([
      [null, 1],  // zremrangebyscore
      [null, 3],  // zcard — count = 3, under limit
      [null, 1],  // zadd
      [null, 1],  // pexpire
    ]);

    const result = await checkIdentityRateLimit('192.168.1.1');
    expect(result).toBe(true);
  });

  it('blocks request when at the 5/hour limit', async () => {
    hoistedPipeline.exec.mockResolvedValue([
      [null, 1],
      [null, 5],  // count = 5, at limit
      [null, 1],
      [null, 1],
    ]);

    const result = await checkIdentityRateLimit('192.168.1.2');
    expect(result).toBe(false);
    expect(hoistedRedis.zremrangebyrank).toHaveBeenCalled();
  });

  it('blocks request when over the limit', async () => {
    hoistedPipeline.exec.mockResolvedValue([
      [null, 1],
      [null, 10],  // count = 10, over limit
      [null, 1],
      [null, 1],
    ]);

    const result = await checkIdentityRateLimit('10.0.0.1');
    expect(result).toBe(false);
  });

  it('fails open on Redis error — does not block legit leads', async () => {
    hoistedPipeline.exec.mockRejectedValue(new Error('Redis down'));

    const result = await checkIdentityRateLimit('172.16.0.1');
    expect(result).toBe(true);
  });

  it('uses separate Redis keys per IP address', async () => {
    hoistedPipeline.exec.mockResolvedValue([
      [null, 1], [null, 1], [null, 1], [null, 1],
    ]);

    await checkIdentityRateLimit('1.2.3.4');
    await checkIdentityRateLimit('5.6.7.8');

    const addCalls = hoistedPipeline.zadd.mock.calls as string[][];
    expect(addCalls[0][0]).toContain('1.2.3.4');
    expect(addCalls[1][0]).toContain('5.6.7.8');
    expect(addCalls[0][0]).not.toBe(addCalls[1][0]);
  });
});
