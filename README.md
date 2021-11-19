# web2-hdwallet-auth

Implementing proper session management, device sync, OAuth, etc. in the standard web 2 way is a pain. HD Wallets are pretty good at it tho.

## Example

```ts
// examples/express-mongo-userprofile.ts
import fetch from "node-fetch";
import dotenv from "dotenv";
import express from "express";
import { Wallet } from "ethers";
import { MongoClient } from "mongodb";

import { Message, Handler } from "..";

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const port = process.env.PORT || 3000;
const privateKey = process.env.PRIVATE_KEY || "0x0123456789012345678901234567890123456789012345678901234567890123";

const client = new MongoClient(uri);

// Message handler. Used for verifying signed messages and executing the right subroutines based on the messages.
const handler = new Handler({
  users: {
    create: async (message: Message): Promise<any> => {
      const { creator, signedData: { email } } = message;
      // send verification email etc
      // @ts-ignore
      await client.db("prod").collection("users").insertOne({ _id: creator, email, verified: false });
      console.log(`${creator} created user ${email}`);
    },
    updateProfile: async (message: Message): Promise<any> => {
      const { creator, signedData: { email, displayName, photoURL } } = message;
      await client.db("prod").collection("users").updateOne({ _id: creator }, { email, displayName, photoURL });
    },
    // ...
  }
});

const app = express();

app.use(express.json());

// Execute signed messages and send a 200 status if the execution is successful
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


    // client-side code
    const wallet = new Wallet(privateKey);
    
    const signed = await Message.issue(wallet, {
      type: ".users.create", // the subroutine path, separated by periods
      validUntil: new Date(Date.now() + 30*1000),
      signedData: { email: "apoorv@venlocode.com" },
    });

    console.log(await fetch(`http://localhost:${port}/api/exec`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(signed)
    // @ts-ignore
    }).then(res => res.json())); // prints { ok: true } in the first call and "_id already exists" in the next ones
  });
});
```