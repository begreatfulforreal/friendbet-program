use crate::errors::ErrorCode;
use crate::state::PriceDirection;
use crate::state::{Bet, BettingMarket};
use anchor_lang::prelude::*;
use pyth_sdk_solana::state::SolanaPriceAccount;
use std::cmp::Ordering;

// Define a constant for the staleness threshold (e.g., 60 seconds)
const STALENESS_THRESHOLD: u64 = 60;

// Define an event for bet settlement
#[event]
pub struct BetSettled {
    pub bet: Pubkey,
    pub market: Pubkey,
    pub token_name: String,
    pub current_price: u64,
    pub price_threshold: u64,
    pub price_direction: PriceDirection,
    pub winner: Pubkey,
}

#[derive(Accounts)]
pub struct SettleBet<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"bet", market.key().as_ref(), &bet.bet_count.to_le_bytes()],
        bump = bet.bump
    )]
    pub bet: Account<'info, Bet>,

    #[account(
        mut,
        seeds = [b"market", market.oracle_address.as_ref()],
        bump = market.bump,
        constraint = market.key() == bet.market
    )]
    pub market: Account<'info, BettingMarket>,

    /// CHECK: This is the Pyth price feed account for the relevant token
    #[account(
        constraint = price_feed.key() == market.oracle_address
    )]
    pub price_feed: AccountInfo<'info>,
}

pub fn settle_bet(ctx: Context<SettleBet>) -> Result<()> {
    let bet = &mut ctx.accounts.bet;
    let market = &mut ctx.accounts.market;

    // Ensure bet is matched
    require!(bet.is_matched, ErrorCode::BetNotMatched);

    // Ensure bet is not already settled
    require!(!bet.is_settled, ErrorCode::BetAlreadySettled);

    // Ensure the current time is after settlement time
    let current_time = Clock::get()?.unix_timestamp;
    require!(
        current_time >= bet.settlement_time,
        ErrorCode::SettlementTimeTooEarly
    );

    // Fetch the latest price from Pyth oracle
    let price_feed_account_info = &ctx.accounts.price_feed;
    let price_feed = SolanaPriceAccount::account_info_to_feed(price_feed_account_info).unwrap();

    // Get current price and ensure it's not stale
    let pyth_price = price_feed
        .get_price_no_older_than(current_time, STALENESS_THRESHOLD)
        .ok_or(ErrorCode::StaleOracleData)?;

    // Convert the price to u64 format (normalize based on exponent)
    let price_exponent = pyth_price.expo;
    let current_price = if price_exponent >= 0 {
        u64::try_from(pyth_price.price).map_err(|_| ErrorCode::PriceConversionError)?
            * 10u64.pow(price_exponent as u32)
    } else {
        u64::try_from(pyth_price.price).map_err(|_| ErrorCode::PriceConversionError)?
            / 10u64.pow((-price_exponent) as u32)
    };

    // Determine the winner based on the price condition
    let winner = match bet.price_direction {
        PriceDirection::Above => match current_price.cmp(&bet.price_threshold) {
            Ordering::Greater => bet.better,
            _ => bet.matcher.unwrap(),
        },
        PriceDirection::Below => match current_price.cmp(&bet.price_threshold) {
            Ordering::Less => bet.better,
            _ => bet.matcher.unwrap(),
        },
    };

    // Update bet
    bet.is_settled = true;
    bet.winner = Some(winner);

    // Update market statistics
    market.total_settled_count = market.total_settled_count.checked_add(1).unwrap();

    // Emit event instead of using msg!
    emit!(BetSettled {
        bet: bet.key(),
        market: market.key(),
        token_name: market.token_name.clone(),
        current_price,
        price_threshold: bet.price_threshold,
        price_direction: bet.price_direction,
        winner,
    });

    msg!(
        "Bet settled for {}: current price {} vs threshold {}",
        market.token_name,
        current_price,
        bet.price_threshold
    );

    Ok(())
}
