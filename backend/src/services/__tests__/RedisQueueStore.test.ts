import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RedisQueueStore } from '../RedisQueueStore';

const makeClient = () => ({
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  rPush: vi.fn().mockResolvedValue(1),
  lTrim: vi.fn().mockResolvedValue('OK'),
  rPop: vi.fn().mockResolvedValue(null),
  lRange: vi.fn().mockResolvedValue([]),
});

describe('RedisQueueStore', () => {
  let client: ReturnType<typeof makeClient>;
  let store: RedisQueueStore;

  beforeEach(() => {
    client = makeClient();
    store = new RedisQueueStore(client);
  });

  describe('saveQueue', () => {
    it('serializes the queue and saves it under the queue key', async () => {
      const queue = [{ id: '1', title: 'Track' }];
      await store.saveQueue(queue);
      expect(client.set).toHaveBeenCalledWith('jukebox:queue', JSON.stringify(queue));
    });
  });

  describe('loadQueue', () => {
    it('returns the parsed queue when data exists', async () => {
      const data = [{ id: '1', title: 'Track' }];
      client.get.mockResolvedValue(JSON.stringify(data));
      const result = await store.loadQueue();
      expect(result).toEqual(data);
    });

    it('returns an empty array when no data is stored', async () => {
      const result = await store.loadQueue();
      expect(result).toEqual([]);
    });
  });

  describe('pushHistory', () => {
    it('appends the entry to the history list', async () => {
      const entry = { spotifyId: 'abc', title: 'Song' };
      await store.pushHistory(entry);
      expect(client.rPush).toHaveBeenCalledWith('jukebox:history', JSON.stringify(entry));
    });

    it('trims history to the last 20 entries', async () => {
      await store.pushHistory({ spotifyId: 'abc' });
      expect(client.lTrim).toHaveBeenCalledWith('jukebox:history', -20, -1);
    });
  });

  describe('popHistory', () => {
    it('returns the parsed entry when history has items', async () => {
      const entry = { spotifyId: 'abc', title: 'Song' };
      client.rPop.mockResolvedValue(JSON.stringify(entry));
      const result = await store.popHistory();
      expect(result).toEqual(entry);
    });

    it('returns null when history is empty', async () => {
      const result = await store.popHistory();
      expect(result).toBeNull();
    });
  });

  describe('loadHistory', () => {
    it('returns all parsed history entries', async () => {
      const entries = [{ spotifyId: 'a' }, { spotifyId: 'b' }];
      client.lRange.mockResolvedValue(entries.map((e) => JSON.stringify(e)));
      const result = await store.loadHistory();
      expect(result).toEqual(entries);
    });

    it('returns an empty array when history is empty', async () => {
      const result = await store.loadHistory();
      expect(result).toEqual([]);
    });
  });
});
