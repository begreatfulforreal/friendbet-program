use anchor_lang::prelude::*;
use std::str::FromStr;

pub mod errors;
pub mod instructions;
pub mod state;

use errors::ErrorCode;
use instructions::*;
use state::*;

declare_id!("BNrkDdFZ6dCaqM1A6wsTkqx7wUafz6zeycH2sm9mWPK8");

// Admin pubkey constant - replace with your actual admin pubkey
const ADMIN: &str = "11111111111111111111111111111111";

// Hardcoded USDC mint address
pub const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

#[program]
pub mod solana_betting_system {
    use super::*;

    #[access_control(enforce_admin(ctx.accounts.authority.key))]
    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        token_name: String,
        oracle_address: Pubkey,
        fee_claimer: Pubkey,
    ) -> Result<()> {
        instructions::initialize_market::initialize_market(
            ctx,
            token_name,
            oracle_address,
            fee_claimer,
        )
    }

    pub fn create_bet(
        ctx: Context<CreateBet>,
        bet_amount: u64,
        price_threshold: u64,
        price_direction: PriceDirection,
        settlement_time: i64,
    ) -> Result<()> {
        instructions::create_bet::create_bet(
            ctx,
            bet_amount,
            price_threshold,
            price_direction,
            settlement_time,
        )
    }

    pub fn match_bet(ctx: Context<MatchBet>) -> Result<()> {
        instructions::match_bet::match_bet(ctx)
    }

    pub fn settle_bet(ctx: Context<SettleBet>) -> Result<()> {
        instructions::settle_bet::settle_bet(ctx)
    }

    pub fn claim_funds(ctx: Context<ClaimFunds>) -> Result<()> {
        instructions::claim_funds::claim_funds(ctx)
    }
}

fn enforce_admin(key: &Pubkey) -> Result<()> {
    #[cfg(not(feature = "test"))]
    require!(
        *key == Pubkey::from_str(ADMIN).unwrap(),
        ErrorCode::OnlyAdmin
    );
    Ok(())
}
