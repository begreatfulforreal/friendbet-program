use crate::state::BettingMarket;
use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

#[derive(Accounts)]
#[instruction(token_name: String, fee_claimer: Pubkey, feed_id_hex: String)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = BettingMarket::LEN,
        seeds = [b"market", &get_feed_id_from_hex(&feed_id_hex).unwrap()[..8]],
        bump
    )]
    pub market: Account<'info, BettingMarket>,

    /// Check: The Pyth price update account
    #[account()]
    pub price_update: Account<'info, PriceUpdateV2>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_market(
    ctx: Context<InitializeMarket>,
    token_name: String,
    fee_claimer: Pubkey,
    feed_id_hex: String,
) -> Result<()> {
    let feed_id_bytes = get_feed_id_from_hex(&feed_id_hex)?;

    let market = &mut ctx.accounts.market;
    market.authority = ctx.accounts.authority.key();
    market.fee_claimer = fee_claimer;
    market.set_token_name(&token_name);
    market.feed_id = feed_id_bytes;
    market.oracle_account = ctx.accounts.price_update.key();
    market.bet_count = 0;
    market.total_volume = 0;
    market.total_matched_count = 0;
    market.total_settled_count = 0;
    market.total_fees_collected = 0;
    market.bump = ctx.bumps.market;

    Ok(())
}
