use anchor_lang::prelude::*;

#[account]
pub struct BettingMarket {
    pub authority: Pubkey,
    pub fee_claimer: Pubkey,  // Added: The account that can claim fees
    pub token_name: [u8; 40], // Name of the asset (BTC, ETH, etc.) - fixed 40 bytes
    pub feed_id: [u8; 32],    // Pyth price feed ID as 32-byte array
    pub bet_count: u64,
    pub total_volume: u64,         // Total volume of USDC ever bet
    pub total_matched_count: u64,  // Total number of bets that were matched
    pub total_settled_count: u64,  // Total number of bets that were settled
    pub total_fees_collected: u64, // Total fees collected in USDC
    pub bump: u8,
}

impl Default for BettingMarket {
    fn default() -> Self {
        Self {
            authority: Pubkey::default(),
            fee_claimer: Pubkey::default(),
            token_name: [0u8; 40],
            feed_id: [0u8; 32],
            bet_count: 0,
            total_volume: 0,
            total_matched_count: 0,
            total_settled_count: 0,
            total_fees_collected: 0,
            bump: 0,
        }
    }
}

impl BettingMarket {
    pub const LEN: usize = 8 + // discriminator
        32 +               // authority
        32 +               // fee_claimer
        40 +               // token_name (fixed 40 bytes)
        32 +               // feed_id (32 bytes)
        8 +                // bet_count
        8 +                // total_volume
        8 +                // total_matched_count
        8 +                // total_settled_count
        8 +                // total_fees_collected
        1; // bump


    /// Set token name from a string, truncating if necessary
    pub fn set_token_name(&mut self, name: &str) {
        let bytes = name.as_bytes();
        let len = std::cmp::min(bytes.len(), 40);
        self.token_name[..len].copy_from_slice(&bytes[..len]);
        // Fill remaining bytes with zeros
        if len < 40 {
            self.token_name[len..].fill(0);
        }
    }

    /// Get token name as a string, removing null bytes
    pub fn get_token_name(&self) -> String {
        let end = self.token_name.iter().position(|&b| b == 0).unwrap_or(40);
        String::from_utf8_lossy(&self.token_name[..end]).to_string()
    }
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
