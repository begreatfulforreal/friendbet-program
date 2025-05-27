#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
use std::str::FromStr;

pub mod errors;
pub mod instructions;
pub mod state;

use errors::ErrorCode;
use instructions::*;
use state::*;

declare_id!("friDwUtQJPFgJ14V4kH5ttdpEFNz4dQcL2ySUswUczu");

// Admin pubkey constant - replace with your actual admin pubkey
const ADMIN: &str = "8kvqgxQG77pv6RvEou8f2kHSWi3rtx8F7MksXUqNLGmn";

// Hardcoded USDC mint address
pub const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

#[program]
pub mod friendbet {
    use super::*;

    #[access_control(enforce_admin(ctx.accounts.authority.key))]
    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        token_name: String,
        fee_claimer: Pubkey,
        feed_id_hex: String,
    ) -> Result<()> {
        instructions::initialize_market::initialize_market(
            ctx,
            token_name,
            fee_claimer,
            feed_id_hex,
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

    #[access_control(enforce_admin(ctx.accounts.admin.key))]
    pub fn create_bet_for_user(
        ctx: Context<CreateBetForUser>,
        bet_amount: u64,
        price_threshold: u64,
        price_direction: PriceDirection,
        settlement_time: i64,
        better_pubkey: Pubkey,
        fund_immediately: bool,
    ) -> Result<()> {
        instructions::create_bet_for_user::create_bet_for_user(
            ctx,
            bet_amount,
            price_threshold,
            price_direction,
            settlement_time,
            better_pubkey,
            fund_immediately,
        )
    }

    pub fn fund_bet(ctx: Context<FundBet>) -> Result<()> {
        instructions::fund_bet::fund_bet(ctx)
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

    pub fn close_bet(ctx: Context<CloseBet>) -> Result<()> {
        instructions::close_bet::close_bet(ctx)
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
