# Bentol SDK

TypeScript SDK for interacting with the Solana Betting System.

## Installation

```bash
npm install solana-betting-sdk
```

## Usage

```typescript
import { SolanaBettingSDK, PriceDirection } from 'solana-betting-sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import { BN } from '@project-serum/anchor';

// Connect to the program
const connection = new Connection('https://api.devnet.solana.com');
const wallet = /* your wallet adapter instance */;
const sdk = SolanaBettingSDK.connect(connection, wallet);

// Initialize a new betting market
const initializeMarket = async () => {
  const tokenName = 'SOL/USD';
  const oracleAddress = new PublicKey('...'); // Your oracle address
  
  const txSignature = await sdk.initializeMarket(tokenName, oracleAddress);
  console.log(`Market initialized: ${txSignature}`);
  
  // Get the market PDA
  const [marketPda] = await sdk.findMarketAddress(wallet.publicKey);
  return marketPda;
};

// Create a new bet
const createBet = async (marketPda: PublicKey) => {
  const betAmount = new BN(1000000000); // 1 SOL in lamports
  const priceThreshold = new BN(20000); // $20.00 with 3 decimal places
  const priceDirection = PriceDirection.Above;
  
  // Set settlement time 24 hours from now
  const settlementTime = new BN(Math.floor(Date.now() / 1000) + 86400);
  
  // Your token mint address
  const mint = new PublicKey('...'); 
  
  const txSignature = await sdk.createBet(
    marketPda, 
    betAmount,
    priceThreshold,
    priceDirection,
    settlementTime,
    mint
  );
  
  console.log(`Bet created: ${txSignature}`);
};

// Fetch all bets for the current user
const fetchMyBets = async () => {
  const bets = await sdk.fetchUserBets(wallet.publicKey);
  console.log('My bets:', bets);
};

// Match a bet
const matchBet = async (betPda: PublicKey, betEscrow: PublicKey, tokenAccount: PublicKey) => {
  const txSignature = await sdk.matchBet(betPda, betEscrow, tokenAccount);
  console.log(`Bet matched: ${txSignature}`);
};

// Settle a bet
const settleBet = async (betPda: PublicKey, marketPda: PublicKey, priceFeedAddress: PublicKey) => {
  const txSignature = await sdk.settleBet(betPda, marketPda, priceFeedAddress);
  console.log(`Bet settled: ${txSignature}`);
};

// Claim funds after winning a bet
const claimFunds = async (betPda: PublicKey, betEscrow: PublicKey, tokenAccount: PublicKey) => {
  const txSignature = await sdk.claimFunds(betPda, betEscrow, tokenAccount);
  console.log(`Funds claimed: ${txSignature}`);
};
```

## API Reference

### Connection

- `SolanaBettingSDK.connect(connection, wallet, programId?)` - Create a new instance of the SDK
- `getProvider()` - Get the provider
- `getProgram()` - Get the program

### PDAs

- `findMarketAddress(authority)` - Find a market account PDA
- `findBetAddress(market, betCount)` - Find a bet account PDA

### Instructions

- `initializeMarket(tokenName, oracleAddress)` - Initialize a new betting market
- `createBet(market, betAmount, priceThreshold, priceDirection, settlementTime, mint)` - Create a new bet
- `matchBet(bet, betEscrow, matcherTokenAccount)` - Match a bet
- `settleBet(bet, market, priceFeed)` - Settle a bet
- `claimFunds(bet, betEscrow, claimerTokenAccount)` - Claim funds from a settled bet

### Queries

- `fetchMarket(marketPda)` - Fetch a betting market account
- `fetchBet(betPda)` - Fetch a bet account
- `fetchMarketBets(market)` - Fetch all bets for a market
- `fetchUserBets(user)` - Fetch all bets for a user 