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
    "0x4279e31cc369bbcc2faf022b382b080e32a8e689ff20fbc530d2a603eb6cd98b";
  const ethIdHex =
    "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";

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
    "HYPE/USD",
    new PublicKey("8kvqgxQG77pv6RvEou8f2kHSWi3rtx8F7MksXUqNLGmn"),
    feedIdHex
  );

  console.log(marketId);
}

main();
