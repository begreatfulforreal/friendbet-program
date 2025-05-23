use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct BettingMarket {
    pub authority: Pubkey,
    pub fee_claimer: Pubkey, // Added: The account that can claim fees
    pub token_name: String,  // Name of the asset (BTC, ETH, etc.)
    pub oracle_address: Pubkey,
    pub bet_count: u64,
    pub total_volume: u64,         // Total volume of USDC ever bet
    pub total_matched_count: u64,  // Total number of bets that were matched
    pub total_settled_count: u64,  // Total number of bets that were settled
    pub total_fees_collected: u64, // Total fees collected in USDC
    pub bump: u8,
}

impl BettingMarket {
    pub const LEN: usize = 8 + // discriminator
        32 +               // authority
        32 +               // fee_claimer
        4 + 32 +           // token_name (max length assumed to be 32)
        32 +               // oracle_address
        8 +                // bet_count
        8 +                // total_volume
        8 +                // total_matched_count
        8 +                // total_settled_count
        8 +                // total_fees_collected
        1; // bump
}

#[account]
#[derive(Default)]
pub struct Bet {
    pub market: Pubkey,
    pub better: Pubkey,
    pub amount: u64,
    pub price_threshold: u64,
    pub price_direction: PriceDirection,
    pub settlement_time: i64,
    pub is_matched: bool,
    pub is_settled: bool,
    pub is_funded: bool,        // New: tracks if the bet has been funded
    pub created_by_admin: bool, // New: tracks if bet was created by admin for another user
    pub winner: Option<Pubkey>,
    pub matcher: Option<Pubkey>,
    pub escrow: Pubkey,
    pub bet_count: u64, // Store the bet count used in PDA derivation
    pub bump: u8,
}

impl Bet {
    pub const LEN: usize = 8 + // discriminator
        32 +               // market
        32 +               // better
        8 +                // amount
        8 +                // price_threshold
        1 +                // price_direction
        8 +                // settlement_time
        1 +                // is_matched
        1 +                // is_settled
        1 +                // is_funded (new)
        1 +                // created_by_admin (new)
        1 + 32 +           // winner (Option<Pubkey>)
        1 + 32 +           // matcher (Option<Pubkey>)
        32 +               // escrow
        8 +                // bet_count
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum PriceDirection {
    #[default]
    Above,
    Below,
}

// Fee constants
pub const FEE_PERCENTAGE: u64 = 3; // 3% fee
pub const FEE_DENOMINATOR: u64 = 100;
