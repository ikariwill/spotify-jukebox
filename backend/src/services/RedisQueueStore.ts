const QUEUE_KEY = "jukebox:queue";
const HISTORY_KEY = "jukebox:history";
const HISTORY_MAX = 20;

export class RedisQueueStore {
  constructor(private readonly client: any) {}

  async saveQueue(queue: object[]): Promise<void> {
    await this.client.set(QUEUE_KEY, JSON.stringify(queue));
  }

  async loadQueue<T>(): Promise<T[]> {
    const raw = await this.client.get(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  async pushHistory(entry: object): Promise<void> {
    await this.client.rPush(HISTORY_KEY, JSON.stringify(entry));
    await this.client.lTrim(HISTORY_KEY, -HISTORY_MAX, -1);
  }

  async popHistory<T>(): Promise<T | null> {
    const raw = await this.client.rPop(HISTORY_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  async loadHistory<T>(): Promise<T[]> {
    const items = await this.client.lRange(HISTORY_KEY, 0, -1);
    return items.map((i: string) => JSON.parse(i));
  }
}
