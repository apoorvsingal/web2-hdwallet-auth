import { ethers } from "ethers";
import Message, { SignedMessage } from "./message";
import MessageStore from "./store";

type HandlerCallback = (message: Message) => Promise<any>;
type HandlerOptions = { [key: string]: HandlerCallback | HandlerOptions }

class Handler {
  _indexed: { [key: string]: HandlerCallback } = {};
  _store: MessageStore;

  constructor(handlers: HandlerOptions, store: MessageStore){
    this._index(handlers);
    this._store = store;
  }

  _index(handlers: HandlerOptions, key: string = ""): void {
    for(const i in handlers){
      if(handlers[i] instanceof Function){
        // @ts-ignore
        this._indexed[`${key}.${i}`] = handlers[i];
      } else {
        // @ts-ignore
        this._index(handlers[i], `${key}.${i}`);
      }
    }
  }

  execRaw(message: Message){
    const handler = this._indexed[message.type];
    
    if(!(handler instanceof Function)){
      throw new Error(`${message.type} is not a valid message type.`); 
    }
    return handler(message);
  }

  async exec(message: Message): Promise<any> { 
    if(message.validUntil.getTime() > 0 && message.validUntil.getTime() < Date.now()){
      throw new Error("Message is expired.");
    }
    if(message.validFor <= 1){
      return await this.execRaw(message);
    }
    
    const hash = await ethers.utils.keccak256(message.signed.signature);
    const stored = await this._store.getItem(hash);
    
    if(message.validFor <= stored.usedFor){
      throw new Error("Message is not valid.");
    }
    this.execRaw(message);

    if(stored.usedFor + 1 == message.validFor){
      await this._store.deleteItem(hash);
    } else {
      await this._store.setItem(hash, { usedFor: stored.usedFor + 1 });
    }
  }

  execSigned(signed: SignedMessage): Promise<any> | any {
    return this.exec(Message.parse(signed));
  }

  async verify(message: Message): Promise<boolean> {
    if(message.validUntil.getTime() > 0 && message.validUntil.getTime() < Date.now()){
      return false;
    }
    if(message.validFor <= 0){
      return true;
    }
    const hash = await ethers.utils.keccak256(message.signed.signature);
    const stored = await this._store.getItem(hash);
    
    if(message.validFor <= stored.usedFor){
      return false;
    }
    return true;
  }

  async verifySigned(signed: SignedMessage): Promise<boolean> {
    return this.verify(Message.parse(signed));
  }
}

export default Handler;
