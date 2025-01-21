import 'dotenv/config'
import {getEnvs} from "./getEnvs";
import {SferumEventType, SferumHelper} from "./helpers/SferumHelper";
import {RedisStorage} from "./connectors/RedisStorage";
import {TelegramHelper} from "./helpers/TelegramHelper";
import {catchTrigger} from "./utils/cacheTrigger";
import {okMessage} from "./constants/OkMessage";

const a: boolean = true;

const main = async () => {
  const envs = getEnvs();

  const redisStorage = new RedisStorage({ url: envs.REDIS_URL });
  const sferumHelper = new SferumHelper(envs.SFERUM_TOKEN, +envs.SFERUM_CHAT_ID, redisStorage);
  const telegramHelper = new TelegramHelper(envs.TELEGRAM_TOKEN, envs.ADMIN_TELEGRAM_ID, redisStorage);

  sferumHelper.on(SferumEventType.NEW_MSG, async (msg, {forward, is_from_bot, author, attachments}) => {
    const is_need_to_notify = catchTrigger(msg)
      .addCatcher(msg => msg.text.toLowerCase().includes("продублир"))
      .addCatcher(() => attachments.length > 0)
      .build();

    console.log(is_need_to_notify, msg.text !== okMessage, (!is_from_bot || a))
    const image_urls = attachments.map(attachment => attachment.photo.sizes.find(size => size.type === "z")?.url || attachment.photo.orig_photo );

    if (is_need_to_notify && msg.text !== okMessage && (!is_from_bot || a)) {
      await telegramHelper.notifyChats("**Сообщение от: " +
        author.last_name_gen + '** ' + author.first_name_gen + ":\n\n" +
        "```Сообщение: "+msg.text+"```", image_urls);
      await forward(okMessage);
    }
  })
}

main();