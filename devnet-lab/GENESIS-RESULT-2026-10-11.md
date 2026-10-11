# YORBI-T first actual Solana Devnet genesis — verified

**Date:** 2026-10-11
**Classification:** SOLANA DEVNET EDUCATIONAL TOKEN ONLY; official YORBI token remains **PRE-TOKEN / NOT ISSUED**.

## Verified actual token
- Name: **YORBI Devnet Trial**
- Symbol: **YORBI-T**
- Network: Solana Devnet (genesis hash checked)
- Program: SPL Token-2022
- Mint address: `7U8PJsoUVgR6JMC3RihaqdNgfGe7Z2w12BTj1Wz5J1E3`
- Phantom owner: `5nhZYYpyrB8gMtmqBBSREyNTdn62u8QEo2T1mV8W4ckc`
- Holder token account: `68edxXfEdcMo4ACh4d36LMe9ifW3X364UT3m9cbuNSve`
- Current supply: `1000000000` raw units at 6 decimals = **1000 YORBI-T**.
- Holder amount: `1000000000` raw units = **1000 YORBI-T**.
- Mint Authority: user's Phantom address (ACTIVE, NOT revoked).
- Freeze Authority: `null`.
- On-chain Token-2022 Metadata name and symbol checked.
- Metadata URI: `https://raw.githubusercontent.com/moogun-jeong/yorbi-world/experiment/yorbi-devnet-genesis-20261011/experiments/solana-devnet/metadata/yorbi-devnet.json`

## Evidence
- User-supplied screenshot from Phantom in-app browser: 2026-10-11 19:35 KST shows wallet mint transaction success and application-side verification (`총발행 1000개 | 내 잔액 1000개 | ... | 메타데이터 정상`).
- GitHub Actions read-only independent verification: [run 38132783177](https://github.com/moogun-jeong/yorbi-world/actions/runs/38132783177) `CHAIN_VERIFY_JSON.status=VERIFIED`, all five checks PASS.
- The screenshot's mint transaction signature was **not returned by public RPC transaction history lookup**, though current on-chain mint and token accounts were verified by owner address. No additional historical-transaction claim.
- [Public Mint account](https://explorer.solana.com/address/7U8PJsoUVgR6JMC3RihaqdNgfGe7Z2w12BTj1Wz5J1E3?cluster=devnet).

## Transfer attempt / remaining items
- User tapped optional 10 token transfer with invalid/blank secondary public wallet address; application logged `Invalid public key input`, so **no transfer completed**.
- Mint Authority revocation **NOT performed**. User should finish any issuance experiments and expressly approve irreversible revocation.
- Browser rendering of character image in Phantom token asset list needs additional validation; on-chain metadata name/symbol/URI are verified.
- No mainnet token, sale, liquidity or actual cost.
- Do not merge this trial code into the public homepage until a separate review; PR stays Draft.
