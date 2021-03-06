import { ethers } from "ethers";

export type SignedMessage = {
  raw: string,
  signature: string,
  data?: string
};

export type MessageOptions = {
  creator: string,
  validUntil: Date,
  type: string,
  signedData: any,
  unsignedData: any,
  signed: { raw: string, signature: string }
};

class Message {
  creator: string;
  validUntil: Date;
  type: string;
  signedData: any;
  unsignedData: any;
  signed: { raw: string, signature: string };

  constructor({ creator, validUntil, type, signedData, unsignedData, signed }: MessageOptions) {
    this.creator = creator;
    this.validUntil = validUntil;
    this.type = type;
    this.signedData = signedData;
    this.unsignedData = unsignedData;
    this.signed = signed;
  }

  static parse({ raw, signature, data }: SignedMessage): Message {
    const message = JSON.parse(raw.toString());
    const creator = ethers.utils.verifyMessage(raw, signature);

    return new Message({
      creator: creator,
      validUntil: new Date(message.validUntil),
      type: message.type,
      signedData: message.signedData,
      unsignedData: data,
      signed: { signature, raw }
    });
  }

  static async issue(wallet: ethers.Wallet, { type, validUntil, signedData }: { type: string, validUntil: Date, signedData: any }): Promise<SignedMessage> {
    const raw = Buffer.from(JSON.stringify({ type, validUntil, signedData }));
    const signature = await wallet.signMessage(raw);

    return { raw: raw.toString(), signature };
  }
}

export default Message;
