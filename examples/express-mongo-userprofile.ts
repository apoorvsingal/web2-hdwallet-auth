import fetch from "node-fetch";
import dotenv from "dotenv";
import express from "express";
import { Wallet } from "ethers";
import { MongoClient } from "mongodb";

import { MessageStore, Message, Handler } from "..";

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const port = process.env.PORT || 3000;
const privateKey = process.env.PRIVATE_KEY || "0x0123456789012345678901234567890123456789012345678901234567890123";

const client = new MongoClient(uri);

const handler = new Handler({
  users: {
    create: async (message: Message): Promise<any> => {
      const { creator, signedData: { email } } = message;

      // send verification email etc

      console.log(`${creator} created user ${email}`);
      // @ts-ignore
      await client.db("prod").collection("users").insertOne({ _id: creator, email, verified: false });
    },
    updateProfile: async (message: Message): Promise<any> => {
      const { creator, signedData: { displayName, photoURL } } = message;

      await client.db("prod").collection("users").updateOne({ _id: creator }, { displayName, photoURL });
    },
    // ...
  }
});

const app = express();

app.use(express.json());

app.post("/api/exec", async (req, res) => {
  try {
    await handler.execSigned(req.body);
    res.status(200).send({ ok: true });
  } catch(error){
    console.error(error);
    // @ts-ignore
    res.status(500).send({ error: error.message});
  }
});

client.connect().then(() => {
  console.log("Connected to MongoDB");

  app.listen(port, async () => {
    console.log(`Listening on port ${port}`);

    const wallet = new Wallet(privateKey);
    
    const signed = await Message.issue(wallet, {
      type: ".users.create",
      validUntil: new Date(Date.now() + 30*1000),
      signedData: {
        email: "apoorv@venlocode.com"
      },
    });

    console.log(await fetch(`http://localhost:${port}/api/exec`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(signed)
    // @ts-ignore
    }).then(res => res.json()));
  });
});
