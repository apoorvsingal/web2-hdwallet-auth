import Message, { SignedMessage } from "./message";

type HandlerCallback = (message: Message) => Promise<any>;
type HandlerOptions = { [key: string]: HandlerCallback | HandlerOptions }

class Handler {
  _indexed: { [key: string]: HandlerCallback } = {};
  
  constructor(handlers: HandlerOptions){
    this._index(handlers);
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
    if(await this.verify(message)){
      return await this.execRaw(message);
    } else {
      throw new Error("Message is expired.");
    }
  }

  execSigned(signed: SignedMessage): Promise<any> | any {
    return this.exec(Message.parse(signed));
  }

  async verify(message: Message): Promise<boolean> {
    if(message.validUntil.getTime() > 0 && message.validUntil.getTime() < Date.now()){
      return false;
    }
    return true;
  }

  async verifySigned(signed: SignedMessage): Promise<boolean> {
    return this.verify(Message.parse(signed));
  }
}

export default Handler;
