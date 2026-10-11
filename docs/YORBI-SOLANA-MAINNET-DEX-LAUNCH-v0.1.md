# YORBI Solana Mainnet + Raydium DEX — Launch Plan v0.1 (PROPOSED)

> Date: 2026-10-11
> Status: **DRAFT / PROPOSED / UNAPPROVED / NO TRANSACTIONS**
> This is a technical and economic design proposal, not a token offering, launch announcement or permission to transact.
> Official YORBI token: **PRE-TOKEN, NOT ISSUED**. Solana Devnet educational mint YORBI-T is separate.

> **Technical standard follow-up (2026-10-11):** See [YORBI Token Tech Spec v0.2](YORBI-TOKEN-TECH-SPEC-v0.2-PROPOSED.md) and [ADR-0001](ADR-0001-YORBI-TOKEN-PROGRAM.md). The preferred architecture is now **original SPL Token + Metaplex metadata + Raydium CPMM**, subject to approval and a new classic-SPL Devnet equivalence test; the previously tested Token-2022 remains an alternative. The 100m supply and allocations are still illustrative, not approved.

## 1. Evidence and project boundaries

- Official GitHub: https://github.com/moogun-jeong/yorbi-world
- Existing roadmap: docs/YORBI-TOKEN-ROADMAP.md
- Experimental PR #2: GitHub Actions PoW faucet blockers; no token created by Actions.
- Experimental PR #3: successful *Devnet-only* Token-2022 mint to the user's Phantom test-mode wallet, independently read back from Solana Devnet. Test mint: 7U8PJsoUVgR6JMC3RihaqdNgfGe7Z2w12BTj1Wz5J1E3; supply and balance 1,000 YORBI-T; freeze authority null; mint authority **still active**. Do not treat that address as the mainnet asset.
- This PR **changes documentation only**. Do not merge a mainnet deployment script into production, deploy a mainnet mint, supply LP, or issue an X announcement without separate owner approval.
- Crypto Moonshot Radar is unrelated and excluded.

## 2. Chain, asset and DEX design (proposed, NOT approved)

| Field | Proposal | Decision status |
| --- | --- | --- |
| Mainnet | Solana mainnet-beta | Proposed |
| Token name | YORBI | Proposed (name conflict / IP review needed) |
| Ticker | YORBI | Proposed (symbol conflict check needed) |
| Token program | **Preferred after technical review:** Original SPL Token Program + Metaplex Fungible Metadata; **alternate:** Token-2022 limited to MetadataPointer + TokenMetadata after evidence-based compatibility checks | **PROPOSED / NOT APPROVED**; see tech spec v0.2 + ADR-0001 |
| Decimal precision | 6 | Proposed, matches Devnet trial |
| Total supply | 100,000,000 tokens, fixed at launch | **ILLUSTRATION, NOT APPROVED** |
| Mint Authority | Mint the fully approved allocation into separately controlled, documented accounts, independently verify, then irreversible revoke; pause if any mismatch | Proposed |
| Freeze Authority | None at creation; avoid account-freeze risk | Proposed |
| Transfer fee, delegate, hooks, whitelist/blacklist, transfer restriction | NONE | Proposed |
| Metadata | Stable immutable image/JSON reference, production-owned HTTPS or content-addressed storage, verify wallet render and licensing; manage update/pointer authority explicitly | TBD |
| Trading pair | YORBI / canonical Solana USDC | Proposed; independently verify USDC mint |
| DEX | Raydium Standard AMM (CPMM) | Proposed; verify official UI/program IDs at launch |
| Fee tier | 0.25% pool swap fee candidate; verify latest live config | Proposed |
| LP ownership | Transparent multi-approval treasury and published custody, time lock/Burn & Earn only after risk review | TBD |
| Sale/presale/airdrop/price promises | No sale, presale, distribution campaign or promised return approved | Prohibited until separately authorized |

**Token-program compatibility:** Raydium CPMM supports both classic SPL and vetted Token-2022 extensions (including MetadataPointer/TokenMetadata). Do not assume arbitrary extensions are safe. New proposed classic SPL + Metaplex path must be tested on Devnet before its use on mainnet; Token-2022 YORBI-T Devnet success does not validate a classic SPL implementation. Raydium AMM v4 accepts only classic SPL, but CPMM remains the default recommendation.

## 3. Tokenomics v0.1 example — 100 million YORBI (not a decision)

| Pool | % | Tokens | Indicative release and safeguards |
| --- | ---: | ---: | --- |
| Liquidity token allocation | 10% | 10,000,000 | Only tokens actually paired with funded USDC count as active LP; publish exact pool and LP custody |
| Community contribution / programs | 30% | 30,000,000 | Escrow / vesting over <=36 months after legal and actual program approval; no unapproved token rewards |
| Product & ecosystem development | 25% | 25,000,000 | Controlled treasury; program-specific spending and monthly public report |
| Team / builders | 15% | 15,000,000 | Proposed 12-month cliff, then 24-month linear vesting; non-transferable until vested where enforceable |
| Long-term operating reserve | 10% | 10,000,000 | Separate treasury, public rules and budget cap; no undisclosed discretionary dumping |
| Future partnerships / grants | 10% | 10,000,000 | Held undistributed until verified need and conflict-of-interest checks |
| **Total** | **100%** | **100,000,000** | **No token presently minted** |

Important: a table or a multisig wallet does not itself implement a trustless vesting schedule. Either use a verified vesting program with audited escrow or accurately disclose any manual governance; do not claim locked balances without verifiable on-chain proof. Locked or treasury holdings are NOT the same as freely circulating supply. All initial transfers, escrow and team disclosures must be independently audited against planned allocations.

The proposed total 100m and percentages are only to compare operational outcomes; final parameters need approval after compliance and feasibility review. No initial circulating supply, token price, FDV, public sale, promised liquidity or listing has been set.

## 4. Cost model and examples

Raydium official user guide currently suggests **about 0.2 SOL** to create a CPMM pool, accounting for 0.15 SOL separate Raydium creation fee, rent and priority/network fees. Mainnet token mint/metaplex or Token-2022 metadata setup is additional. Budget **0.3–0.5 SOL** for a small one-off plan as an internal safety envelope; this is not a fee guarantee. Obtain fresh signed/simulated quotes prior to release.

| Scenario | Real SOL working allowance (planning) | External stablecoin paired in LP | Equivalent YORBI placed into pool | Initial pool TVL at opening price | Suitable for |
| --- | --- | --- | --- | --- | --- |
| Technical-only mint | 0.05–0.2 SOL | 0 USDC | 0 | 0 | Measured mainnet deployment after separate approval, NOT public trading |
| Tiny liquidity experiment | 0.3–0.5 SOL | 500 USDC | YORBI worth 500 USDC initially | approx. 1,000 USD | Extremely shallow, **NOT recommended for public launch** |
| Small controlled pilot | 0.3–0.5 SOL | 1,000 USDC | YORBI worth 1,000 USDC | approx. 2,000 USD | Limited trading, still vulnerable to price impact |
| Larger initial pilot candidate | 0.3–0.6 SOL | 2,500 USDC | YORBI worth 2,500 USDC | approx. 5,000 USD | Better depth, STILL risky and only after compliance |

**Total external capital is NOT equal to the stated LP TVL:** For example, 500 USDC plus YORBI *valued by the initial pool price* at another 500 USDC gives 1,000 USD initial TVL. YORBI is not a second 500 USD of external cash and cannot be assumed sellable at quoted initial spot for all inventory.

Not included: SOL/USDC purchase spreads, external legal/tax opinions, expert security review or audit, IP licensing/registration, marketing, hardware wallet, multi-signature management, RPC uptime, long-term custody or incident response. These costs may easily dominate transaction fees. Treat external professional costs as **unquoted blockers** rather than zero.

### Shallow liquidity example

In a simple fee-free CPMM with 500 USDC as the quote side, a 50 USDC buy raises the pool's marginal YORBI price by approximately 21%, and its average execution price is ~9.09% above the pre-swap price. Raydium fee, network/priority fees, arbitrage, MEV, and other live pools make actual execution different. Small TVL can produce severe price moves without project development progress.

### Valuation/price coupling example (NOT TARGET)

If 10m YORBI is deposited alongside 1,000 USDC, the initial pool implied spot is 0.0001 USDC per YORBI. Applied mechanically to hypothetical 100m total supply, nominal FDV would be 10,000 USDC. It is NOT committed investment value, realizable liquidation value or pricing recommendation. Team retains 90m tokens in this example, requiring extreme disclosure and enforceable vesting before any public pool.

## 5. Sequenced gates and individual owner sign-offs

| Gate | Required evidence | Owner approval decision |
| --- | --- | --- |
| **G1 — Specification** | Chain+token program, decimals/supply/allocation, circulation methodology, rights/utility, official ownership, metadata URL | Approve **token specification only**, no on-chain action |
| **G1-L — Legal feasibility** | Korean counsel memo for issuance/DEX/securities/VASP/business entity/tax/advertising; target jurisdiction matrix incl EU if targeted | Approve **jurisdiction/operating scope only** |
| **G2 — Security & simulations** | Devnet 2-wallet mint/transfer, owner+freeze checks, metadata display, token-program DEX compatibility, threat tests, ledger evidence | Approve **security gate only** |
| **G2-F — Financing and custody** | Verified signer/hardware+recovery, wallet roles, USDC provenance/official mint, maximum total SOL and USDC exposure, written LP withdrawal/lock policy | Approve **budget envelope**, still no transfers |
| **G3-A — Mainnet mint** | Transaction build and independent review, transaction simulation and fee quotation, designated on-chain recipient accounts, chain ID/program verification | Separate explicit **deploy/mint authorization** |
| **G3-B — Allocation & authority** | Real on-chain mint and account proof, all allocation/escrow distributions rechecked, explicit authority revocation proposal | Separate approval of **transfers / irreversible authority revoke** |
| **G3-C — DEX LP** | Raydium mint and pool identities, verified pool fees, initial spot/FDV and slippage scenario, reserve balance, LP custody, safe rollback limits | Separate explicit **USDC + YORBI LP funding authorization** |
| **G3-D — Public communication** | Official website/X exact mint and pool address reconciled independently, risk disclosures, team allocations, launch status and contacts | Separate explicit **publication authorization** |
| **G4/G5 — Days 1-90** | Weekly treasury/LP/vault disclosures, incident monitoring, actual roadmap delivery, budget and security response | Periodic post-launch budget reviews |

No automatic progression between gates. If law, custody, tax or security is unresolved then gate is **NO-GO**, even if a technical command works.

## 6. Technical implementation order after approvals

1. Snapshot test evidence from experimental PR #3; complete optional second-wallet Devnet transfer (unverified now), freeze/mint roles, wallet metadata display and DEX compatibility simulation.
2. Draft immutable JSON/token artwork; confirm usage rights and durable hosting. Prefer Solana standard Token Program if Token-2022 metadata path causes wallet/DEX compatibility issues.
3. Use separate multi-approval operations wallet and treasury accounts, not the original disposable GitHub runner or a single personal hot wallet.
4. Model exact supply allocations and prove proposed vesting on-chain; verify mainnet balance/rent requirements without broadcasting transactions.
5. Prepare contract/mint creation transaction and unsigned simulation, save all predicted account changes and fee envelopes.
6. ONLY after G3-A approval deploy on mainnet, record actual mint and confirm program, rights and authorities.
7. ONLY after G3-B approval transfer or escrow tokens, remove authorities where appropriate, record evidence.
8. ONLY after G3-C approval create CPMM pool and provide actual YORBI/USDC liquidity; do not confuse pool creation with exchange listing.
9. ONLY after G3-D approval publish exact addresses through approved official channels; maintain weekly disclosure and incident plan.

## 7. Link to source facts (verified 2026-10-11)

- Raydium CPMM costs, 0.15 SOL fee / ~0.2 SOL working pool creation allowance: https://docs.raydium.io/ray/protocol-fees and https://docs.raydium.io/user-flows/create-cpmm-pool
- Token-2022 allowance and LP security context: https://docs.raydium.io/products/cpmm/overview
- Solana authority revocation and fixed supply: https://solana.com/docs/tokens/basics/set-authority
- Korean current Virtual Asset User Protection Act, effective 2026-10-02: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=290735
- 2026 FSC enforcement: https://www.fsc.go.kr/po010106/87357
- MiCA EU public offer/admission rules if EU targeted: https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-4-offers-public-crypto-assets-other

## 8. Blockers before any actual action

- Real-world offering/operator entity and legal perimeter undecided.
- Final token program, ticker and supply/distribution not approved.
- Stablecoin quote capital, LP custody and lock choice not approved.
- External legal/security review quote missing; no final project spending envelope.
- Trial Devnet 10-token transfer and authority revocation are still pending; **do not** imply completed.
- All URLs/mint addresses referenced from Devnet are **NON-PRODUCTION**.

**Release recommendation:** Do not go to public DEX at 500 USDC quote liquidity by default. Prefer spec/legal/security completion first, then a separately approved small mainnet mint, and only later a quoted funded liquidity pilot.
