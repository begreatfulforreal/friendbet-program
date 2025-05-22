/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solana_betting_system.json`.
 */
export type SolanaBettingSystem = {
  "address": "BNrkDdFZ6dCaqM1A6wsTkqx7wUafz6zeycH2sm9mWPK8",
  "metadata": {
    "name": "solanaBettingSystem",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claimFunds",
      "discriminator": [
        145,
        36,
        143,
        242,
        168,
        66,
        200,
        155
      ],
      "accounts": [
        {
          "name": "claimer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bet",
          "writable": true
        },
        {
          "name": "betEscrow",
          "writable": true
        },
        {
          "name": "claimerTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "createBet",
      "discriminator": [
        197,
        42,
        153,
        2,
        59,
        63,
        143,
        246
      ],
      "accounts": [
        {
          "name": "better",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "bet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "market.bet_count",
                "account": "bettingMarket"
              }
            ]
          }
        },
        {
          "name": "betEscrow",
          "writable": true,
          "signer": true
        },
        {
          "name": "betterTokenAccount",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "betAmount",
          "type": "u64"
        },
        {
          "name": "priceThreshold",
          "type": "u64"
        },
        {
          "name": "priceDirection",
          "type": {
            "defined": {
              "name": "priceDirection"
            }
          }
        },
        {
          "name": "settlementTime",
          "type": "i64"
        }
      ]
    },
    {
      "name": "initializeMarket",
      "discriminator": [
        35,
        35,
        189,
        193,
        155,
        48,
        170,
        203
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tokenName",
          "type": "string"
        },
        {
          "name": "oracleAddress",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "matchBet",
      "discriminator": [
        48,
        221,
        200,
        183,
        19,
        70,
        27,
        155
      ],
      "accounts": [
        {
          "name": "matcher",
          "writable": true,
          "signer": true
        },
        {
          "name": "bet",
          "writable": true
        },
        {
          "name": "betEscrow",
          "writable": true
        },
        {
          "name": "matcherTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "settleBet",
      "discriminator": [
        115,
        55,
        234,
        177,
        227,
        4,
        10,
        67
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "bet",
          "writable": true
        },
        {
          "name": "market"
        },
        {
          "name": "priceFeed"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "bet",
      "discriminator": [
        147,
        23,
        35,
        59,
        15,
        75,
        155,
        32
      ]
    },
    {
      "name": "bettingMarket",
      "discriminator": [
        227,
        130,
        231,
        148,
        180,
        228,
        97,
        28
      ]
    }
  ],
  "events": [
    {
      "name": "betSettled",
      "discriminator": [
        57,
        145,
        224,
        160,
        62,
        119,
        227,
        206
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidSettlementTime",
      "msg": "Settlement time must be in the future"
    },
    {
      "code": 6001,
      "name": "betAlreadyMatched",
      "msg": "Bet is already matched"
    },
    {
      "code": 6002,
      "name": "betAlreadySettled",
      "msg": "Bet is already settled"
    },
    {
      "code": 6003,
      "name": "betNotMatched",
      "msg": "Bet is not matched yet"
    },
    {
      "code": 6004,
      "name": "settlementTimeTooEarly",
      "msg": "Current time is before settlement time"
    },
    {
      "code": 6005,
      "name": "betNotSettled",
      "msg": "Bet is not settled yet"
    },
    {
      "code": 6006,
      "name": "notWinner",
      "msg": "Only the winner can claim funds"
    },
    {
      "code": 6007,
      "name": "betExpired",
      "msg": "Bet has expired and can no longer be matched"
    },
    {
      "code": 6008,
      "name": "settlementTimeTooClose",
      "msg": "Settlement time must be at least 1 hour in the future"
    },
    {
      "code": 6009,
      "name": "staleOracleData",
      "msg": "Oracle data is stale"
    },
    {
      "code": 6010,
      "name": "priceConversionError",
      "msg": "Error converting price data"
    },
    {
      "code": 6011,
      "name": "priceFeedLoadError",
      "msg": "Failed to load price feed"
    }
  ],
  "types": [
    {
      "name": "bet",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "better",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "priceThreshold",
            "type": "u64"
          },
          {
            "name": "priceDirection",
            "type": {
              "defined": {
                "name": "priceDirection"
              }
            }
          },
          {
            "name": "settlementTime",
            "type": "i64"
          },
          {
            "name": "isMatched",
            "type": "bool"
          },
          {
            "name": "isSettled",
            "type": "bool"
          },
          {
            "name": "winner",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "matcher",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "betSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bet",
            "type": "pubkey"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "currentPrice",
            "type": "u64"
          },
          {
            "name": "priceThreshold",
            "type": "u64"
          },
          {
            "name": "priceDirection",
            "type": {
              "defined": {
                "name": "priceDirection"
              }
            }
          },
          {
            "name": "winner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "bettingMarket",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "tokenName",
            "type": "string"
          },
          {
            "name": "oracleAddress",
            "type": "pubkey"
          },
          {
            "name": "betCount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "priceDirection",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "above"
          },
          {
            "name": "below"
          }
        ]
      }
    }
  ]
};
