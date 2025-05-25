import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { FriendbetSDK } from ".";

async function main() {
  const connection = new Connection(process.env.RPC_URL || "");
  const wallet = Keypair.fromSecretKey(
    Buffer.from(process.env.ANCHOR_KEYPAIR || "", "base64")
  );

  const client = new FriendbetSDK(connection, wallet);

  const marketId = await client.initializeMarket(
    "SOL/USD",
    new PublicKey("11111111111111111111111111111111"),
    "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"
  );

  console.log(marketId);
}

main();
