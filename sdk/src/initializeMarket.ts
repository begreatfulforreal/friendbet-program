import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { FriendbetSDK, getKeypairFromFile } from "./index";

async function main() {
  // throw error if RPC_URL or ANCHOR_KEYPAIR is not set
  if (!process.env.SOLANA_RPC_URL || !process.env.ANCHOR_WALLET) {
    throw new Error("RPC_URL or ANCHOR_KEYPAIR is not set");
  }

  const wallet = getKeypairFromFile(process.env.ANCHOR_WALLET);

  const connection = new Connection(process.env.SOLANA_RPC_URL || "");

  const client = new FriendbetSDK(connection, wallet);

  const feedIdHex =
    "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

  // Debug: Let's see what our SDK generates
  const [marketPda, bump] = await client.findMarketAddress(feedIdHex);
  console.log("SDK derived market PDA:", marketPda.toString());
  console.log("Feed ID hex:", feedIdHex);

  // Let's also manually check what bytes we're using for derivation
  const feedIdBytes = Buffer.from(feedIdHex.replace("0x", ""), "hex");
  console.log("Feed ID bytes (first 8):", feedIdBytes.subarray(0, 8));
  console.log(
    "Feed ID bytes (first 8) as hex:",
    feedIdBytes.subarray(0, 8).toString("hex")
  );

  // Check what program ID we're using - need to access it through the SDK
  // Let's add a method to get the program ID
  console.log("Program ID being used: [checking...]");

  const marketId = await client.initializeMarket(
    "SOL/USD",
    new PublicKey("11111111111111111111111111111111"),
    feedIdHex
  );

  console.log(marketId);
}

main();
