import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { SolanaBettingSDK, PriceDirection } from "./src/index";

// This is just a demo, in a real app you would use a wallet adapter
class DemoWalletAdapter {
  publicKey: PublicKey;

  constructor(private keypair: Keypair) {
    this.publicKey = keypair.publicKey;
  }

  async signTransaction(tx: any) {
    tx.partialSign(this.keypair);
    return tx;
  }

  async signAllTransactions(txs: any[]) {
    return txs.map((tx) => {
      tx.partialSign(this.keypair);
      return tx;
    });
  }
}

async function main() {
  try {
    // In a real app, you would get the keypair from a wallet
    const keypair = Keypair.generate();
    const walletAdapter = new DemoWalletAdapter(keypair);

    // Connect to devnet
    const connection = new Connection(
      "https://api.devnet.solana.com",
      "confirmed"
    );

    // Initialize the SDK
    const sdk = SolanaBettingSDK.connect(connection, walletAdapter);

    // For demonstration purposes only - these steps would be separate actions in a real app

    // 1. Initialize a new betting market
    const tokenName = "SOL/USD";
    const oracleAddress = new PublicKey(
      "8tfDNiaEyrV6Q1U4DEXrEigs9DoDtkugzFbybENEbCDz"
    ); // Example address

    console.log("Initializing market...");
    try {
      const marketTx = await sdk.initializeMarket(tokenName, oracleAddress);
      console.log("Market initialized:", marketTx);

      // Get the market PDA
      const [marketPda] = await sdk.findMarketAddress(walletAdapter.publicKey);
      console.log("Market PDA:", marketPda.toString());

      // 2. Create a bet
      console.log("Creating bet...");
      const betAmount = new BN(100000000); // 0.1 SOL
      const priceThreshold = new BN(20000); // $20.00
      const priceDirection = PriceDirection.Above;
      const settlementTime = new BN(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
      const mint = new PublicKey("So11111111111111111111111111111111111111112"); // Wrapped SOL

      try {
        const betTx = await sdk.createBet(
          marketPda,
          betAmount,
          priceThreshold,
          priceDirection,
          settlementTime,
          mint
        );
        console.log("Bet created:", betTx);

        // 3. Fetch user bets
        console.log("Fetching user bets...");
        const userBets = await sdk.fetchUserBets(walletAdapter.publicKey);
        console.log("User bets:", userBets);
      } catch (error) {
        console.error("Error creating bet:", error);
      }
    } catch (error) {
      console.error("Error initializing market:", error);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// In a real application, you would call main() when appropriate
// main().catch(console.error);

// Export the main function for use in other files
export { main };
