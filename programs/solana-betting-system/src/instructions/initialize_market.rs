use crate::state::BettingMarket;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(token_name: String, oracle_address: Pubkey, fee_claimer: Pubkey)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = BettingMarket::LEN,
        seeds = [b"market", oracle_address.as_ref()],
        bump
    )]
    pub market: Account<'info, BettingMarket>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_market(
    ctx: Context<InitializeMarket>,
    token_name: String,
    oracle_address: Pubkey,
    fee_claimer: Pubkey,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    market.authority = ctx.accounts.authority.key();
    market.fee_claimer = fee_claimer;
    market.token_name = token_name;
    market.oracle_address = oracle_address;
    market.bet_count = 0;
    market.total_volume = 0;
    market.total_matched_count = 0;
    market.total_settled_count = 0;
    market.total_fees_collected = 0;
    market.bump = ctx.bumps.market;

    msg!(
        "Betting market initialized for {} using USDC for bets",
        market.token_name
    );
    Ok(())
}
