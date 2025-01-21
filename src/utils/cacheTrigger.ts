import {SferumMessage} from "../helpers/SferumTypes";

export type Catcher<T = string> = (msg: T)=>boolean | Promise<boolean>;

// Pattern: Builder (сочёл очень удобным, чтобы не заморачиваться с декораторами, классами и подобным)

export const catchTrigger = <T = SferumMessage>(msg: T) => {
  return {
    __msg: msg,
    catchers: [] as Catcher<T>[],
    addCatcher: function (catcher: Catcher<T>) {
      this.catchers.push(catcher);
      return this;
    },
    build: function () {
      return this.catchers
        .map(catcher => catcher(this.__msg))
        .includes(true);
    }
  }
}
