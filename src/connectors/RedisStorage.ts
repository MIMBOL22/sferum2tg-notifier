import {createClient, RedisClientType} from "redis";
import {BaseStorage} from "./BaseStorage";

// Абстракция для Redis-a
export class RedisStorage extends BaseStorage{
  private readonly client: RedisClientType;

  constructor({url}: {url: string}) {
    super();

    this.client = createClient({ url })
    this.client.connect()
      .then(() => {
        console.log('Redis client connected')
      });
  }

  async setLastMessageTimestamp(timestamp: number): Promise<void> {
    await this.client.set('lastMessageTimestamp', timestamp);
  }

  async getLastMessageTimestamp(): Promise<number> {
    const lastMessageTimestamp = await this.client.get('lastMessageTimestamp');
    if (lastMessageTimestamp === null) {
      const nowTimestamp = Math.floor(Date.now() / 1000);
      await this.setLastMessageTimestamp(nowTimestamp)
      return nowTimestamp;
    }
    return Number(lastMessageTimestamp);
  }

  async getTelegramChatIds(): Promise<string[]> {
    return await this.client.sMembers('telegramChatIds');
  }
  async addTelegramChatId(id: string): Promise<void> {
    await this.client.sAdd('telegramChatIds', id);
  }
  async removeTelegramChatId(id: string): Promise<void> {
    await this.client.sRem('telegramChatIds', id);
  }
}