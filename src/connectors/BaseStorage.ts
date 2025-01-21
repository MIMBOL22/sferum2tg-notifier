/**
 * При желании можно дописать свой класс для хранилища,
 * унаследовавшись от этого. Важно соблюдать типы
 */
export abstract class BaseStorage {
  protected constructor(params?: any) {}
  async getLastMessageTimestamp(): Promise<number> { return 0 }
  async setLastMessageTimestamp(timestamp: number): Promise<void> {}
  async getTelegramChatIds(): Promise<string[]> { return [] }
  async addTelegramChatId(id: string): Promise<void> {}
  async removeTelegramChatId(id: string): Promise<void> {}
}