import {BaseStorage} from "../connectors/BaseStorage";
import EventEmitter from "node:events";
import {SferumChat, SferumContext, SferumForwardFunc, SferumMessage} from "./SferumTypes";
import * as console from "node:console";

type SferumFetchOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  params?: { [key: string]: string };
  body?: any;
  bodyType?: "json" | "x-www-form-urlencoded";
  subdomain?: string;
  auth?: boolean;
  auth_tried?: number;
};


enum VK_MESSENGER_ACCOUNT_TYPE {
  VK = 0,
  SFERUM = 2,
}

export enum SferumEventType {
  NEW_MSG = "NEW_MSG",
}


class SferumEmitter extends EventEmitter {
  constructor() {
    super();
  }

  emit(event: SferumEventType, data: SferumMessage, context: SferumContext) : boolean;
  emit(event: SferumEventType, data: any, forward: any) : boolean {
    return super.emit(event, data, forward);
  }

  on(event: SferumEventType, listener: (data: SferumMessage) => void): any;
  on(event: SferumEventType, listener: (data: SferumMessage, context: SferumContext) => void): any;
  on(event: SferumEventType, listener: (data: any, context: SferumContext) => void) {
    return super.on(event, listener);
  }

}

// Абстракция для Сферума
export class SferumHelper {
  private readonly API_PROTO = "https://";
  private readonly BASE_SUBDOMAIN = "api";
  private readonly BASE_DOMAIN = "vk.me";
  private readonly API_VERSION = "5.245";
  private readonly API_APP_ID = "8202606";
  private readonly UPDATE_INTERVAL_MS = 3000;

  private storage: BaseStorage;
  private emitter: SferumEmitter;
  private bot_id?: number;
  private access_token?: string;
  private observerInterval?:  NodeJS.Timeout;
  private readonly remixdsid: string;
  private readonly chatID: number;

  constructor(remixdsid: string, chatID: number, storage: BaseStorage) {
    this.remixdsid = remixdsid;
    this.storage = storage;
    this.chatID = chatID;
    this.emitter = new SferumEmitter();

    this.updateAccessToken()
      .then(()=>this.startObserver())
      .then(()=>console.log("Успешная инициализация SferumHelper"));
  }

  on(event: SferumEventType, listener: (data: SferumMessage) => void): any;
  on(event: SferumEventType, listener: (data: SferumMessage, context: SferumContext) => void): any;
  on(event: SferumEventType, listener: (data: any, context: SferumContext) => void) {
    this.emitter.on(event, listener);
  }

  stopObserver() {
    clearInterval(this.observerInterval);
  }

  private async sendMessages(peer_id: number, text: string, additional?: any) {
    console.log("ABOBA424", additional)
    await this.apiFetch("/method/messages.send", {
      method: "POST",
      body: {
        peer_id,
        random_id: Math.floor(Math.random() * 100000),
        message: text,
        lang: "ru",
        ...additional
      },
      auth: true,
      bodyType: "x-www-form-urlencoded"
    });
  }

  private async getNewMessages() {
    try {
    const apiResponse = await this.apiFetch("/method/messages.getHistory", {
      method: "POST",
      body: {
        peer_id: this.chatID,
        start_cmid:"159",
        count:"10",
        offset:"-1",
        extended:"1",
        group_id:"0",
        fwd_extended:"1",
        lang:"ru",
        fields:"id,first_name,first_name_gen,first_name_acc,first_name_ins,last_name,last_name_gen,last_name_acc,last_name_ins,sex,has_photo,photo_id,photo_50,photo_100,photo_200,contact_name,occupation,bdate,city,screen_name,online_info,verified,blacklisted,blacklisted_by_me,language,can_call,can_write_private_message,can_send_friend_request,can_invite_to_chats,friend_status,followers_count,profile_type,contacts,employee_mark,employee_working_state,is_service_account,image_status,photo_base,educational_profile,edu_roles,name,type,members_count,member_status,is_closed,can_message,deactivated,activity,ban_info,is_messages_blocked,can_send_notify,can_post_donut,site,reposts_disabled,description,action_button,menu,role,unread_count,wall",
      },
      auth: true,
      bodyType: "x-www-form-urlencoded"
    });

    let last_message_timestamp = await this.storage.getLastMessageTimestamp();

    const messages = apiResponse.response.items
      .filter((message: SferumMessage) => message.date > last_message_timestamp);

    if (messages.length > 0) {
      last_message_timestamp = messages[0].date;
      this.storage.setLastMessageTimestamp(last_message_timestamp);
    }

    messages
      .map((message: SferumMessage) => {
        const answer: SferumForwardFunc = (text: string) => this.sendMessages(message.peer_id, text, {
          forward: {
            peed_id: message.peer_id,
            conversation_message_id: message.conversation_message_id,
            is_reply: true
          }
        });

        const context: SferumContext = {
          forward: answer,
          author: apiResponse.response.profiles.find(profile => profile.id === message.from_id),
          chat: apiResponse.response.conversations[0] as SferumChat,
          is_from_bot: message.from_id === this.bot_id,
          attachments: message.attachments,
        }
        return this.emitter.emit(SferumEventType.NEW_MSG, message, context)
      });
    } catch (error) {
      console.error("Ошибка в проходе getNewMessages Sferum:",error);
    }
  }

  private startObserver() {
    this.observerInterval = setInterval(() => this.getNewMessages(), this.UPDATE_INTERVAL_MS);
  }

  private async updateAccessToken() {
    console.log("Обновление токена доступа")
    const apiResponse = await this.apiFetch("/", {
      method: "POST",
      params: {
        act: "web_token",
      },
      subdomain: "web"
    });

    const sferumAccount = apiResponse.find(account => account.profile_type == VK_MESSENGER_ACCOUNT_TYPE.SFERUM);
    if (sferumAccount) {
      this.access_token = sferumAccount.access_token;
      this.bot_id = sferumAccount.user_id;
    } else {
      throw new Error("На указанном аккаунте VK Мессенджера нет аккаунта Сферума");
    }
  }

  private async apiFetch(uri: string, options: SferumFetchOptions) {
    const params = (new URLSearchParams({
      ...options.params,
      v: this.API_VERSION,
      app_id: this.API_APP_ID,
    }).toString());


    let body = options.body;

    if (options.auth && this.access_token) {
      body = {
        access_token: this.access_token,
        ...body,
      }
    }
    if (body && typeof body === "object"){
      body = Object.fromEntries(Object.entries(body).map(([key, value]) => {
        if(typeof value === "object") {
          return [key, JSON.stringify(value)]
        }
        return [key, value]
      }))
    }
    body = options?.bodyType === "json" ? JSON.stringify(body) : new URLSearchParams(body).toString();
    const subdomain = options?.subdomain || this.BASE_SUBDOMAIN;

    const apiResponse = await fetch(`${this.API_PROTO}${subdomain}.${this.BASE_DOMAIN}${uri}?${params}`, {
      method: options.method,
      headers: {
        "Content-Type": options?.bodyType === "json" ? "application/json" : "application/x-www-form-urlencoded",
        "Cookie": `remixdsid=${this.remixdsid}`,
      },
      body,
    });

    if (!apiResponse.ok) throw new Error("Ошибка запроса:" + apiResponse.statusText)

    const parsedResponse: any = await apiResponse.json();

    if (parsedResponse?.error !== undefined) {
      console.warn("Ошибка запроса:",`${this.API_PROTO}${subdomain}.${this.BASE_DOMAIN}${uri}?${params}`, {
        method: options.method,
        headers: {
          "Content-Type": options?.bodyType === "json" ? "application/json" : "application/x-www-form-urlencoded",
          "Cookie": `remixdsid=${this.remixdsid}`,
        },
        body,
      }, JSON.stringify(parsedResponse));
      if (parsedResponse?.error?.error_code !== 5) {
        throw new Error("Ошибка запроса:" + parsedResponse.error.error_msg)
      }
      if (!options.auth) throw new Error("Необходима авторизация для: " + uri)
      if (options?.auth_tried && options?.auth_tried >= 5) throw new Error("Неоднократные неуспешные обновления токена:" + uri)

      await this.updateAccessToken();
      return await this.apiFetch(uri, {
        ...options,
        auth_tried: (options?.auth_tried || 0) + 1
      });

    }
    return parsedResponse;
  }

}