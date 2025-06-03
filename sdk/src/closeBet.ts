import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { FriendbetSDK, getKeypairFromFile } from "./index";

async function main() {
  // throw error if RPC_URL or ANCHOR_KEYPAIR is not set
  if (!process.env.SOLANA_RPC_URL || !process.env.ANCHOR_WALLET) {
    console.log(process.env.SOLANA_RPC_URL);
    console.log(process.env.ANCHOR_WALLET);
    throw new Error("RPC_URL or ANCHOR_KEYPAIR is not set");
  }

  const wallet = getKeypairFromFile(process.env.ANCHOR_WALLET);

  const connection = new Connection(process.env.SOLANA_RPC_URL || "");

  const client = new FriendbetSDK(connection, wallet);

  const marketId = await client.closeBet(
    new PublicKey("8yCQFBFNCXC3vbuQXJ5rmbYxMoVFriPY5DoZiFE38pXn"),
    new PublicKey("4RFW19mwhpfYD82Q1rpPYwe9Tr2MSBJUW81mMrUd8v8W")
  );

  console.log(marketId);
}

main();
