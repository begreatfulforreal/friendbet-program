import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { FriendbetSDK } from ".";


async function main() {
    
    const connection = new Connection(process.env.RPC_URL || "");
    const wallet = Keypair.fromSecretKey(Buffer.from(process.env.ANCHOR_KEYPAIR || "", "base64"));
    
    const client = new FriendbetSDK(connection, wallet);

    const marketId = await client.initializeMarket("Test Market", new PublicKey("11111111111111111111111111111111"), new PublicKey("11111111111111111111111111111111"));

    console.log(marketId);
}

main();