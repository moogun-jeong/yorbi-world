# YORBI — Solana Mainnet Token Technical Specification v0.2

> **STATUS: PROPOSED / DRAFT / UNAPPROVED — 2026-10-11**
> **NO MAINNET DEPLOYMENT. NO SIGNATURES. NO SOL OR USDC SPENT.**
> This document recommends architecture, **not** token sale terms, actual on-chain facts or permission to publish.
> Source baseline: \`docs/YORBI-TOKEN-ROADMAP.md\`, launch plan v0.1 (PR #4), Devnet-only YORBI-T result (PR #3).

## A. Technical decision (recommendation, not owner approval)

**Preferred:** Solana **Original Token Program (SPL Token)** + **Metaplex Token Metadata Program** + **Raydium Standard AMM / CPMM**.

**Alternate:** Solana **Token-2022**, ONLY \`MetadataPointer\` + \`TokenMetadata\` extensions if future integration requirements prove added value, after separate compatibility evidence.

Why prefer the original program: YORBI wants a plain transferable, fixed-max-supply fungible token with display metadata and DEX swaps, not special transfer fees, mint delegates or hooks. The older Token Program fits this with no token extensions, broad history of integration and supports CPMM and AMM v4. Token-2022 also works with CPMM, so its selection is neither a security failure nor a requirement for trading. No custom token smart contract is planned.

**Source-fact distinction:**
- Raydium CPMM is recommended for new constant-product pairs; accepts Token-2022 only on a vetted extension allow-list (MetadataPointer, TokenMetadata, TransferFeeConfig, InterestBearingConfig and ScaledUiAmount at source review). AMM v4 is original SPL-only. https://docs.raydium.io/products/cpmm/overview
- Solana original Token Program and Token-2022 both implement mint, token accounts, transfers and mint/freeze authorities. https://solana.com/docs/tokens
- Classic mint uses Metaplex Token Metadata PDA for name/symbol/URI. https://solana.com/docs/tokens/metaplex
- Token-2022 supports built-in metadata, but that property is not essential for YORBI. https://solana.com/docs/tokens/extensions/metadata

### Comparison

| Category | Original SPL + Metaplex (RECOMMENDED) | Token-2022 limited extensions (ALTERNATE) |
| --- | --- | --- |
| Fungible transfer / fixed upper bound | Supported | Supported |
| Name, symbol, art | Metaplex PDA + off-chain JSON | MetadataPointer/TokenMetadata in mint + off-chain JSON |
| CPMM pool creation | Supported | Supported when allowlisted extension set and real routing verified |
| AMM v4 legacy | Supported | Not supported |
| Token-specific special privileges | Not in mint by default; holder-authorized delegates still possible | Many optional extensions; strictly omit extra powers |
| Mint setup overhead | Base mint rent + separate Metaplex metadata account rent | Larger mint account rent with extensions; no separate metadata PDA if built in |
| Integration risk | Preferred when minimum capabilities suffice | Different programs/extension support must be validated end-to-end |
| Audit surface | 2 established programs and metadata hosting | Extension parsing / authority count / wallet & DEX routing checks |

## B. Token identity and immutable fields

| Property | Value / treatment | Status |
| --- | --- | --- |
| Network | Solana **mainnet-beta**, not Devnet | Proposed |
| Original token program ID | \`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA\` | Protocol constant |
| Metadata program ID | \`metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s\` | Protocol constant |
| On-chain token standard | Metaplex \`Fungible\`, **not NFT** | Proposed |
| Display name | \`YORBI\` | Proposed (verify name/brand rights) |
| Ticker/symbol | \`YORBI\` | Proposed (conflict and impersonation checks) |
| Decimals | **6** | Proposed (matches Devnet practice) |
| Initial total supply | **TBD — ILLUSTRATIVE 100,000,000 YORBI ONLY** | Unapproved |
| Raw supply example | \`100_000_000n * 10n**6n = 100_000_000_000_000n\` (within \`u64\`) | Example |
| Fixed supply semantics | Issue approved amount, verify allocations, revoke mint authority (\`None\`); supply can later decrease if holder burns | Proposed |
| Mainnet Mint Address | **DOES NOT EXIST** | Not issued |
| Canonical quote asset | Authentic Solana USDC; independently confirm mint/program and official source before LP creation | Proposed |
| Pool type | Raydium CPMM, pair YORBI/USDC | Proposed |
| Pool Address | **DOES NOT EXIST** | Not created |

**Decimals are set when creating the mint and cannot be arbitrarily edited later.** Old Devnet Token-2022 mint \`7U8PJsoUVgR6JMC3RihaqdNgfGe7Z2w12BTj1Wz5J1E3\` MUST NOT be used as the mainnet mint.

Supply is not the same as circulating supply: treasury allocations, custody wallets, escrow status and LP deposits must be separately accounted for. LP reserve in an allocation schedule is not necessarily LP liquidity placed.

## C. Authority and custody matrix

| Scope | At initial mint | After approved issuance/distribution | Required verification |
| --- | --- | --- | --- |
| **Mint Authority** | Approved limited-operation signer (not disposable GitHub Actions or browser service key) | **\`None\` / revoked irreversibly** only after final supply reconciliation and explicit owner approval | Mint authority \`null\`; unsuccessful attempt to mint more in sandbox |
| **Freeze Authority** | **\`None\` at mint initialization** | \`None\` permanently | Mint state \`freezeAuthority === null\` |
| **Metaplex Update Authority** | A separately controlled metadata operator / multisig as technically supported | Prefer metadata \`isMutable=false\` once content-addressed URI, final name/symbol/image and UI tests are verified; only freeze on explicit approval | Metadata fields + \`isMutable\` and update-authority identity |
| **Metadata JSON/image** | Public, version-locked and independently verified | Immutable content references with resilient gateways/copies; record SHA256 of actual bytes | Fetchable JSON/image, identical contents, required display fields |
| **Token account owners** | Per allocation approved wallet/escrow addresses | Independent treasury/team/LP/community custody per disclosed policy | ATAs and owner balances match allocations |
| **Token-account delegate** | No project-approved delegate at deployment | No undisclosed project discretionary delegates | Token-account delegates checked on project-controlled accounts |
| **Close authority** | No custom mint-close extension in original SPL | No hidden mint closure privilege | Program ownership verified |
| **DEX LP withdrawal/control** | N/A until funded | Separate custody/lock approval, never implied by mint authority revocation | LP receipt ownership, lock proofs, unlock/withdrawal disclosure |

Original SPL tokens can still be burned by their holder or authorized account delegate. Revoking Mint Authority fixes the **maximum future supply** against additional issuance; it does NOT prevent token burns or by itself lock treasury/LP allocations. No program can categorically prevent a holder from delegating their own token account under the standard semantics. See https://solana.com/docs/tokens/basics/burn-tokens and https://solana.com/docs/tokens/basics/revoke-delegate .

### Authority steps: no automatic on-chain actions

1. Owner approves final spec, full addresses/allocations and legal scope (G1).
2. Validate the signing architecture for mint authority, treasury, LP and metadata without posting keys. Prepare completely separate real-funds environment (G2/G2-F).
3. Construct Mint + Metadata PDA instructions; simulate with no broadcast and review fees, authority keys and exact token program.
4. Only after **separate explicit mainnet authorization (G3-A)** create on-chain mint and metadata.
5. Issue exactly final approved supply to designated escrow/holding accounts per signed distribution policy. Check \`mint.supply\`, raw decimal units and all allocation ATA balances against the approved manifest. Unexpected account/privilege => **STOP**.
6. Only after **separate explicit authority-revocation authorization (G3-B)** send \`SetAuthority(MintTokens, None)\`. Verify \`mintAuthority=null\` and \`freezeAuthority=null\` from a second independent RPC.
7. Metadata immutability \`isMutable=false\` is a separate, irreversible permission action; requires dedicated signoff after final image/JSON checks, NOT bundled as an undocumented side effect.
8. Only after LP + legal approval create Raydium CPMM, supply actual YORBI and USDC, and verify program IDs, balances, LP ownership and pool availability.
9. Only after communications approval update official YORBI sites/X with **exact independently verified mainnet** addresses.

Transaction fee payment in SOL is distinct from USDC quote-token funding and stored reserve. The existing Vercel Devnet browser app is **not authorized** for mainnet conversions.

## D. Metadata specification

**Metaplex Token Metadata PDA** is derived deterministically from \`["metadata", metadata_program_id, mint_pubkey]\`; \`name\`, \`symbol\`, \`uri\` live on-chain in that PDA while image/description are referenced by the URI. Token standard \`Fungible\`, royalty / seller fee basis points **0** (not a transfer tax), creators fields only if the parties/verification can be justified.

Example **non-deployable proposed off-chain JSON template** (placeholder URI is intentionally not final):
\`\`\`json
{
  "name": "YORBI",
  "symbol": "YORBI",
  "description": "YORBI — Born Curious. Built to Evolve. Official token metadata; valid only with a published, verified Solana mainnet mint.",
  "image": "REPLACE_WITH_IMMUTABLE_CONTENT_ADDRESSED_IMAGE_URI",
  "external_url": "https://yorbi-world.arhyme.workers.dev/",
  "attributes": [
    {"trait_type": "Project", "value": "YORBI World"},
    {"trait_type": "Network", "value": "Solana Mainnet"}
  ],
  "properties": {
    "category": "image"
  }
}
\`\`\`

**Do not publish this as an official asset until mint and artwork approval.** The JSON document URI should itself be content-addressed/immutable where feasible (IPFS CID, Arweave verified transaction) or independently checksummed with durable read-only mirrors. GitHub raw branch URLs are editable and can disappear; even if the on-chain URI is immutable, the off-chain server content may change. Verify final image licensing, reasonable image MIME, dimensions and Phantom/Raydium/Explorer rendering in real-world clients.

For Metaplex, \`isMutable=false\` is a permanent metadata content edit prohibition; do not confuse it with Mint Authority. If uncertain about public display, keep metadata update authority controlled in secure multisig until separately approved, and clearly disclose temporary mutability.

## E. Raydium compatibility/DEX go/no-go

**CPMM only** for initial pilot; neither AMM v4 nor CLMM is required. For Token-2022 comparison, verify exact allowlisted extensions and no transfer-fee/hook/pausable/personal delegate features.

- [ ] Verify actual Token Program ID and Metaplex Metadata account before minting.
- [ ] Verify the same exact mainnet mint identifier recognized by Phantom, Solscan/Solana Explorer and Raydium UI.
- [ ] Confirm Raydium CPMM program ID from verified official docs/UI at approval time, not from unverified tokens or user-provided links.
- [ ] Confirm canonical USDC Mint Address and token program using trusted sources.
- [ ] Confirm Raydium live CPMM fee-tier config, separate **pool-creation** cost, creator fee opt-in and any actual token fee.
- [ ] Simulate opening pool with approved initial YORBI amount + actual USDC quote; calculate initial spot price, FDV, swap slippage and minimum liquidity levels.
- [ ] Explicitly decide and disclose LP token ownership and withdrawal rights; Mint Authority revoked DOES NOT lock LP.
- [ ] Review DEX/pool support against official documentation again immediately before any mainnet transaction.
- [ ] Verify a wallet-to-wallet transfer and metadata image in Devnet and read-only checks across two RPC endpoints.
- [ ] No swap, LP transfer, paid service or official announcement until G3 separate approval gates.

### Sign-off / immutable approval boundaries

G1 Token Spec approval ≠ G2 security clearance ≠ G3-A Mint signing approval ≠ G3-B Authority/escrow approval ≠ G3-C LP funding approval ≠ G3-D public communication approval.

**No mainnet instructions, transactions, secret keys, live account addresses or deployment scripts are created by this document.**

## F. Open decisions and blockers

| Issue | Status / action |
| --- | --- |
| Program choice | **PROPOSED: original SPL Token**, owner sign-off pending |
| Total supply / allocation / vesting | **TBD**; prior 100m/30% community etc. are scenario only |
| Token symbol and IP | Preliminary \`YORBI\`; collision/brand/legal check pending |
| Mainnet owner/fee payer | **TBD**; separate signer and recovery plan |
| Metadata permanent storage / mutable flag | **TBD**; design+client acceptance before irreversible lock |
| Raydium pool budget and token quote ratio | **TBD**; no USDC funding approved |
| Devnet end-to-end test | Trial Token-2022 minted/verified; second wallet transfer and mint authority revocation unverified |
| Classic SPL + Metaplex Devnet equivalence test | **NOT YET EXECUTED**; must run before mainnet adoption |
| Security / Korean legal review | **NOT COMPLETED**; both required for launch gate |

## G. Official references (verified at draft time)

- Solana Token Programs overview: https://solana.com/docs/tokens
- Solana Mint creation: https://solana.com/docs/tokens/basics/create-mint
- Solana Metaplex metadata: https://solana.com/docs/tokens/metaplex
- Solana Set Authority: https://solana.com/docs/tokens/basics/set-authority
- Solana Burn: https://solana.com/docs/tokens/basics/burn-tokens
- Token-2022 metadata pointer fields: https://solana.com/docs/tokens/extensions/metadata
- Raydium CPMM: https://docs.raydium.io/products/cpmm/overview
- Raydium create CPMM: https://docs.raydium.io/user-flows/create-cpmm-pool
- Token Metadata update restrictions: https://developers.metaplex.com/tokens/update-token
