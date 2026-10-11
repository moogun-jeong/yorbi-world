# ADR-0001 — YORBI Token Program choice for Solana Mainnet (2026-10-11)

- Status: **PROPOSED, not approved**.
- Scope: Solana mainnet token technical architecture and Raydium CPMM integration, NOT token economics, legal clearance, or network deployment.
- Owner approval date: **TBD**.
- Implementation/verification: **NOT IMPLEMENTED ON MAINNET**.

## Context

YORBI Devnet educational token \`YORBI-T\` successfully exercised Token-2022 with MetadataPointer/TokenMetadata, displayed mint supply 1,000 and account balance 1,000 on confirmed Devnet; Mint Authority still active and 10-token transfer not proven. Mainnet asset does not exist. The initial PR #4 plan named Token-2022 as a conditional leading option, but it did not choose a final token standard.

## Alternatives

| Choice | Benefits | Risks / burdens | Result |
| --- | --- | --- | --- |
| Original SPL Token Program + Metaplex Fungible Metadata | Small, established feature set; CPMM and AMM v4 work; familiar wallet/indexer metadata PDA; no unused mint extensions | Metaplex metadata PDA requires separate rent and state management; artwork JSON availability still external | **Preferred for a plain fixed-supply YORBI token** |
| Token-2022 with *only* MetadataPointer and TokenMetadata | Already proven in YORBI-T Devnet, metadata on mint, supported by Raydium CPMM | Additional extension/authority controls, different program ID and wallet/router path, AMM v4 unavailable; no advanced feature currently needed | **Supported fallback, not forbidden** |
| Custom token contract / fee/tax/blacklist model | Flexibility | High audit, deployment and trust costs; conflicts with transparent-simple token objective | **Rejected for first release** |

## Proposed decision

Use **Original SPL Token Program** at \`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA\`, mint with decimals 6, create Metaplex \`Fungible\` Metadata (separate PDA), no Freeze Authority, no hidden control hooks or transfer tax, mint only final approved supply and permanently revoke Mint Authority after distribution is confirmed. Metadata should point to a stable content-addressed JSON/image; the content must be tested before separately making immutable. Create Raydium **CPMM** pool only after separate legal/financial/LP authorization.

The 100-million YORBI scenario and supply allocation in PR #4 are **NOT approved** and do not determine this architecture decision. When approving final spec separately, choose operator, multisig, distribution + vesting, update authority/custody and metadata hosting.

## Evidence to accept ADR as APPROVED

1. Owner explicitly selects this architecture and reviews tradeoff with the prior working Token-2022 Devnet experiment.
2. New **original SPL+Metaplex** Devnet mint and metadata UI is created, owner-to-owner transfer checked, supply and authority changes checked and recorded.
3. Raydium CPMM legacy SPL token acceptance and actual wallet/routing metadata display independently reviewed, with no fabricated trade or fee guarantees.
4. Token custody/recovery, actual authority roles and the irreversible mint/update transitions reviewed by a human.
5. No unresolved legal/security blockers for public launch.

This document is a design recommendation only. **No mainnet signing, mint, DEX pool or money movement is authorized.**

## Sources

- https://docs.raydium.io/products/cpmm/overview
- https://solana.com/docs/tokens
- https://solana.com/docs/tokens/metaplex
- https://solana.com/docs/tokens/basics/set-authority
- https://developers.metaplex.com/tokens/update-token
