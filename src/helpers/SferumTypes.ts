export enum SferumAttachmentType {
  PHOTO = "photo"
}
export enum SferumAttachmentPhotoType {
  base = "base",
  r = "r",
  q = "q",
  p = "p",
  o = "o",
  w = "w",
  z = "z",
  y = "y",
  x = "x",
  m = "m",
  s = "s"
}

export type SferumForwardFunc = (message: string) => Promise<void>;

export type SferumProfile = {
  id: number;
  first_name: string;
  last_name: string;
  first_name_gen: string;
  last_name_gen: string;
  photo_50: string;
  photo_100: string;
  photo_200: string;
}

export type SferumChat = {
  peer: {
    id: number;
    type: "chat" | "private";
    local_id: number;
  };
  chat_settings: {
    title: string;
    admin_ids: number[];
  }
}

export type SferumContext = {
  forward: SferumForwardFunc;
  author: SferumProfile;
  chat: SferumChat;
  is_from_bot: boolean;
  attachments: SferumAttachment[];
}


export type SferumAttachmentPhotoSize<T extends SferumAttachmentPhotoType> = {
  height: number;
  width: number;
  type: T;
  url: string;
}

export type SferumAttachmentPhoto = {
  type: SferumAttachmentType.PHOTO;
  photo: {
    id: number;
    owner_id: number;
    orig_photo: SferumAttachmentPhotoSize<SferumAttachmentPhotoType.base>;
    sizes: SferumAttachmentPhotoSize<SferumAttachmentPhotoType>[];
  }
}

export type SferumAttachment = SferumAttachmentPhoto;

export type SferumMessage = {
  date: number;
  from_id: number;
  id: number;
  attachments: SferumAttachment[];
  text: string;
  peer_id: number;
  conversation_message_id: number;
}