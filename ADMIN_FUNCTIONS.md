# Admin Functions for Betting System

This document describes the new admin functionality that allows administrators to create bets on behalf of users and handle funding separately.

## Overview

The betting system now supports two new workflows:

1. **Admin-created bets**: Admins can create bets for users who don't want to directly interact with the blockchain
2. **Deferred funding**: Bets can be created without immediate funding and funded later by anyone

## New Instructions

### 1. `create_bet_for_user`

Allows an admin to create a bet for another user with optional immediate funding.

**Parameters:**
- `bet_amount`: u64 - Amount to bet in USDC lamports (1 USDC = 1,000,000 lamports)
- `price_threshold`: u64 - Price threshold for the bet
- `price_direction`: PriceDirection - Either `Above` or `Below`
- `settlement_time`: i64 - Unix timestamp when the bet should be settled
- `better_pubkey`: Pubkey - The public key of the user the bet is being created for
- `fund_immediately`: bool - Whether to fund the bet immediately during creation

**Access Control:** Only admin can call this function

**State Changes:**
- Creates a new `Bet` account 
- Creates an escrow token account for the bet
- Increments market bet count
- If `fund_immediately` is true:
  - Transfers USDC from admin's token account to bet escrow
  - Sets `is_funded: true` and adds to market volume
- If `fund_immediately` is false:
  - Sets `is_funded: false` and does NOT add to market volume until funded later

### 2. `fund_bet`

Allows anyone to fund an existing unfunded bet by depositing USDC.

**Parameters:** None (all required info is derived from accounts)

**Access Control:** Anyone can call this function

**State Changes:**
- Transfers USDC from funder to bet escrow
- Sets `is_funded: true` on the bet
- Adds bet amount to market total volume

## New State Fields

### Bet Account

Two new boolean fields have been added to the `Bet` struct:

- `is_funded: bool` - Tracks whether the bet has received its required funding
- `created_by_admin: bool` - Tracks whether the bet was created by an admin for another user

## Workflow Examples

### Example 1: Admin Creates Unfunded Bet, User Funds Later

1. **Admin creates unfunded bet for user:**
   ```rust
   // Admin calls create_bet_for_user with fund_immediately = false
   create_bet_for_user(
       bet_amount: 100_000_000, // 100 USDC
       price_threshold: 50000,
       price_direction: PriceDirection::Above,
       settlement_time: 1234567890,
       better_pubkey: user_pubkey,
       fund_immediately: false
   )
   ```
   
2. **User or someone else funds the bet:**
   ```rust
   // Anyone can call fund_bet
   fund_bet() // Transfers 100 USDC to bet escrow
   ```

3. **Bet becomes available for matching:**
   - Only after funding can the bet be matched by other users

### Example 2: Admin Creates and Funds Bet Immediately

1. **Admin creates and funds bet for user in one transaction:**
   ```rust
   // Admin calls create_bet_for_user with fund_immediately = true
   create_bet_for_user(
       bet_amount: 100_000_000, // 100 USDC
       price_threshold: 50000,
       price_direction: PriceDirection::Above,
       settlement_time: 1234567890,
       better_pubkey: user_pubkey,
       fund_immediately: true
   )
   ```

2. **Bet is immediately available for matching:**
   - No additional funding step required
   - Other users can match the bet right away

### Example 3: Traditional User-Created Bet

The original `create_bet` function still works as before:
- User creates and funds bet in one transaction
- `is_funded` is set to `true` immediately
- `created_by_admin` is set to `false`

## Important Constraints

### Matching Constraints
- Bets can only be matched if `is_funded: true`
- This prevents unfunded bets from being matched

### Funding Constraints
- Only unfunded bets can receive funding
- Bet must not be expired (current time < settlement_time)
- Bet must not already be matched or settled

### Admin Constraints
- Only the designated admin can call `create_bet_for_user`
- Admin address is hardcoded in the program (configurable via deployment)

## Error Codes

New error codes added:
- `BetAlreadyFunded`: Trying to fund an already funded bet
- `BetNotFunded`: Trying to match a bet that hasn't been funded yet

## TypeScript SDK Usage

See `example_admin_functions.ts` for a complete TypeScript implementation including:

- `AdminBettingManager` class for admin operations
- Helper functions for deriving PDAs
- Example usage patterns

## Security Considerations

1. **Admin Access Control**: The admin address is hardcoded in the program. In production, consider using a multisig or upgradeable admin system.

2. **Funding Validation**: Anyone can fund a bet, which is intentional to allow flexible funding sources.

3. **Race Conditions**: Multiple people could attempt to fund the same bet simultaneously. The first successful transaction will fund it, others will fail with `BetAlreadyFunded`.

4. **Settlement Time**: Bets cannot be funded after their settlement time has passed.

## Migration Notes

This is a breaking change to the `Bet` account structure. Existing bets will need to be migrated or the program will need a migration instruction to handle the new fields.

For new deployments, ensure all existing `create_bet` calls are updated to handle the new state fields appropriately. 