import { describe, expect, it, vi } from 'vitest';
import { isBusyError, pauseBefore, QueueTimeout, waitInLine } from '../src/controllers/busyQueue';

const busy = (code = 'aborted') => Object.assign(new Error('busy'), { code });
const instant = () => Promise.resolve();

describe('the ticket queue', () => {
  it('knows "too busy" answers from real refusals', () => {
    expect(isBusyError(busy('aborted'))).toBe(true);
    expect(isBusyError(busy('resource-exhausted'))).toBe(true);
    expect(isBusyError(busy('failed-precondition'))).toBe(true);
    expect(isBusyError(busy('permission-denied'))).toBe(false);
    expect(isBusyError(new Error('Only 2 tickets are left'))).toBe(false);
  });

  it('pauses longer each time, never more than 12 seconds, and never the same for everyone', () => {
    expect(pauseBefore(1, () => 1)).toBe(1700);
    expect(pauseBefore(10, () => 1)).toBe(12000);
    expect(pauseBefore(10, () => 0)).toBe(6000);
  });

  it('waits in line and books once the crowd clears', async () => {
    const attempt = vi.fn()
      .mockRejectedValueOnce(busy())
      .mockRejectedValueOnce(busy())
      .mockResolvedValue(['BAI-1']);
    const onWaiting = vi.fn();
    await expect(waitInLine(attempt, { sleep: instant, onWaiting })).resolves.toEqual(['BAI-1']);
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(onWaiting).toHaveBeenCalledTimes(1);
  });

  it('never retries an answer meant for the buyer, such as sold out', async () => {
    const attempt = vi.fn().mockRejectedValue(new Error('Sold out'));
    await expect(waitInLine(attempt, { sleep: instant })).rejects.toThrow('Sold out');
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('does not book twice when an earlier attempt went through but its answer was lost', async () => {
    const attempt = vi.fn().mockRejectedValueOnce(busy('unavailable')).mockResolvedValue(['BAI-NEW']);
    const alreadyBooked = vi.fn().mockResolvedValue(['BAI-FIRST']);
    await expect(waitInLine(attempt, { sleep: instant, alreadyBooked })).resolves.toEqual(['BAI-FIRST']);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('gives up politely after the longest wait, with nothing booked', async () => {
    let t = 0;
    const attempt = vi.fn().mockRejectedValue(busy());
    await expect(waitInLine(attempt, { sleep: async (ms) => { t += ms; }, now: () => t, maxWaitMs: 30_000 }))
      .rejects.toBeInstanceOf(QueueTimeout);
  });
});
