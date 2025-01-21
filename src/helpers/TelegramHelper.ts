import {Context, Telegraf} from "telegraf";
import {BaseStorage} from "../connectors/BaseStorage";

// Абстракция для Telegram бота
export class TelegramHelper {
  private readonly bot: Telegraf;
  private readonly storage: BaseStorage;
  private readonly adminId: string;

  constructor(token: string, adminId: string, storage: BaseStorage) {
    this.adminId = adminId;
    this.storage = storage;

    this.bot = new Telegraf(token);
    this.registerHandlers();
    this.bot.launch()
      .then(() => console.log("Telegram bot has been started"));
  }

  async notifyChats(message: string, imgUrls: string[] = []) {
    const chatList = await this.storage.getTelegramChatIds();
    const sendPromises = chatList.map(async (chatId) => {



      if (imgUrls.length > 0) {
        try {
            await this.bot.telegram.sendMediaGroup(
              chatId,
              imgUrls.map(imgUrl => ({ type: "photo", media: imgUrl, caption: message, parse_mode:  "MarkdownV2"}))
            )
        } catch (e) {
          console.error("Ошибка пересылки изображений изображения:", imgUrls, "chatId:", chatId, "Ошибка:", e);
        }
      } else {
        try {
          await this.bot.telegram.sendMessage(chatId, message, { parse_mode: "MarkdownV2" });
        } catch (e) {
          console.error("Ошибка пересылки теста сообщение:", message, "chatId:", chatId, "Ошибка:", e);
        }
      }
    });
    await Promise.all(sendPromises);
  }


  private registerHandlers() {
    this.bot.command("ping", async (ctx) => {
      await ctx.reply("pong");
    });

    this.bot.command("start", async (ctx) => {
      await ctx.reply("Здравствуйте!\n" +
        "Этот бот создан для дублирования объявлений со сферума в телеграм.\n\n" +
        "Как пользоваться:\n" +
        "Информация: /start\n" +
        "Подписаться: /register\n" +
        "Отписаться: /unregister\n\n" +
        "Администратор бота: @" + process.env.ADMIN_TELEGRAM_USERNAME);
    });

    this.bot.command("register", async (ctx) => {
      if ((ctx.message.from.id+"") !== this.adminId && ctx.chat.type !== "private"){
        return await ctx.reply("Вы не являетесь администратором бота, обратитесь к @" + process.env.ADMIN_TELEGRAM_USERNAME);
      }
      await this.storage.addTelegramChatId(ctx.chat.id+"");
      await ctx.reply("Вы успешно зарегистрированы");
    });

    this.bot.command("unregister", async (ctx) => {
      if ((ctx.message.from.id+"") !== this.adminId && ctx.chat.type !== "private") {
        return await ctx.reply("Вы не являетесь администратором бота, обратитесь к @" + process.env.ADMIN_TELEGRAM_USERNAME);
      }
      await this.storage.removeTelegramChatId(ctx.chat.id+"");
      await ctx.reply("Вы успешно отписались");
    });

    process.once('SIGINT', () => this.bot.stop('SIGINT'))
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'))
  }

}