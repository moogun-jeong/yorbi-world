# YORBI Founder Vesting & Treasury Controls — Proposed v0.3

> Date: 2026-10-11
> Status: **PROPOSED / UNAPPROVED / NO DEPLOYMENT / NO FUND MOVEMENT**
> Previous Tokenomics A ("Balanced") is a **conversation proposal**, not final or a replacement for the illustrative earlier PR #4 15%-founder split.
> Everything is budget/scenario design, not a real reserve or offering. Mainnet YORBI remains **UNISSUED**.

## 0. Baseline and governance assumptions

The proposed (not approved) supply is **100,000,000 YORBI, decimals 6**:
- Founder & team 20% = 20,000,000
- Product & AI development 25% = 25,000,000
- Operating reserve 10% = 10,000,000
- Community 30% = 30,000,000
- LP reserve 10% = 10,000,000
- Future partnerships 5% = 5,000,000
- Total: 100%. No mint currently exists.

Do not equate "Treasury 35%" with tradable inventory or actual cash. Even if labeled different budgets, the founder may indirectly control community/LP/partner reserves as an authorized signer. Publish actual signatory concentration, authority and public vest/escrow proofs. No speculative token sell proceeds can be booked as guaranteed runway.

## 1. Ownership vs access vs time lock — distinct controls

| Allocation | Economically intended beneficiary | Custody / signing control design | Time lock or release gate | Available for sale? |
| --- | --- | --- | --- | --- |
| **20m founder/team** | Founder subject to future team split approval | Audited independent escrow/vesting program, **beneficiary** = protected founder address; **sender** = reviewed treasury multisig | 12-month cliff, then 24-month vesting; non-revocable founder grant preferred; ensure no unwanted recipient reassign/listing permissions | Locked portions **NO**; vested tokens still require disclosed dealing policy |
| **25m development** | Project treasury, NOT founder personal grant | Multisig-controlled vault or dedicated vault #2 | Quarterly approved milestones, expense-level transaction proposals, detailed counterparty receipts | No discretionary market sells; separate legal/financial approval |
| **10m operations** | Project treasury, NOT founder personal grant | Separate on-chain vault preferred; if one Basic Squads Vault is used, 25/10 split exists ONLY in audited ledger, **not truly enforced on-chain** | Written quarterly and annual limits, two approvals for any transfers, external expense evidence | Token sale is independently approved action, not automatic runway |
| **30m community** | Future contributors | Separate pending-allocation treasury; release only after genuine program/eligibility and legal review | Escrow / vesting per program | No distribution has been approved |
| **10m LP allocation** | Protocol liquidity budget | Dedicated LP custody and later pool positions with documented withdrawal controls | Per-pool approval, lock or explicit custody disclosure | Not all 10m is intended as immediate LP |
| **5m partnerships** | Future verified counterparties | Pending grant treasury; no implied partner | Valid agreements and staged grants | Not scheduled until approved |

### Schematic

\`\`\`text
(Proposed) 100m classic SPL Token + Metaplex
    Mint authority -> controlled temporary issuer -> AFTER supply/allocation proof: revoke (separate approval)
         | (only once, AFTER approval)
         +---- 20m Founder -> audited non-cancelable vesting escrow -> Founder beneficiary wallet as time vests
         +---- 25m Product -> Squads project vault (or distinct vault)
         +---- 10m Ops     -> second Squads project vault or audited accounting subset of same vault
         +---- 30m Community, 10m LP, 5m Partners -> separate pending reserves under approved controls

    Metadata update authority -> governance-approved custody (separate from Mint Authority)
    LP token / liquidity custody -> separate policy and approval (mint revoke DOES NOT lock LP)
\`\`\`

## 2. Founder 20m vesting: an executable CONCEPT, not a configured contract

Proposed schedule: **0 released before month 12; then 24 equal monthly nominal installments until month 36.** 20,000,000 / 24 = ~833,333.333333 YORBI per month; account for final rounding at 6 decimals. Pre-cliff recipient claimable balance should be **zero** at all times. A vesting tool's definition of "cliff amount" vs "cliff date" differs and may allow accrued unlock at cliff, so **test actual unlock table** before funding.

| Months after start | Nominal cumulative unlocked | Nominal still locked |
| --- | ---: | ---: |
| 0 | 0 | 20,000,000 |
| 6 | 0 | 20,000,000 |
| 12 | 0 | 20,000,000 |
| 13 | 833,333.33 | 19,166,666.67 |
| 18 | 5,000,000 | 15,000,000 |
| 24 | 10,000,000 | 10,000,000 |
| 30 | 15,000,000 | 5,000,000 |
| 36 | 20,000,000 | 0 |

**Streamflow candidate**: https://docs.streamflow.finance/en/articles/9670413-create-a-vesting-contract
- Configure Solana + the **official actual mainnet mint** (TBD) and 20m lock amount.
- Set future start/time windows to yield actual zero pre-cliff and unlock through 36 months. Vendor monthly periodicity is **30.4 days**; implementation contract timestamps must be recalculated to avoid drifting vs calendar months. Check cliff amount equals intended zero before month 12 and doesn't unlock an accumulated catch-up at the wrong boundary.
- Set **Cancel by Sender = false** for founder grant, subject to legal review. If cancellable, unused locked tokens go back to sender, which is materially different from credible irrevocable vesting: https://docs.streamflow.finance/en/articles/9674831-cancel-contract
- Recipient-transfer setting options Only Recipient / Only Sender / Both / Neither. "Neither" gives strong immutability but lost-address recovery risk; "Only Recipient" permits wallet recovery but also transfers beneficial rights. Review recipient multisig compatibility and succession requirements before selecting any.
- No marketplace listing, unwanted top-ups, pauses or creator-initiated redirection; do not assume UI prevents transfer of contractual rights without checking.
- Beneficiary should not be a single insecure everyday trading hot wallet. Prefer secure separate wallet / beneficiary recovery arrangement after platform interoperability tests.
- Get actual immutable on-chain vault/account/program, transaction, recipient, grant amount and unlock schedule before saying vesting is active. Audit claims are vendor statements, not immunity from exploits: https://docs.streamflow.finance/en/articles/9338573-has-streamflow-been-audited

### Fee surprise: how to fund without violating 100m supply

Streamflow individual/no-subscription pricing currently says **0.16 SOL creation + ~0.0147 SOL network/rent = ~0.1747 SOL** and **0.19% YORBI charged ON TOP of vested amount**, not removed from 20m; optional auto-claim costs extra. Verify live UI pricing before approval:
https://docs.streamflow.finance/en/articles/9675153-individual-vs-business-costs-of-using-streamflow

For 20m founder vest:
- 20,000,000 * 0.0019 = **38,000 additional YORBI** service fee.
- If exactly 20m YORBI is founder vested, 38k extra MUST be funded from a **separately labeled fee reserve WITHIN the existing 100m allocations**, or reduce beneficiary's promised 20m and disclose that choice. **NEVER mint extra 38k outside fixed 100m.**
- Example bookkeeping (UNAPPROVED): earmark 38,000 from the 10,000,000 Ops budget -> operational available 9,962,000 before other costs, founder grant still 20m. Or reserve equivalent fees when percentages are formally revised.
- Vendor may liquidate token-denominated fees; this can create additional future sale pressure; cannot assume fee token will remain locked. Avoid assuming 0.19% token fee is free because newly issued token spot is illiquid.
- Streamflow individual plan supports only **one contract** under no subscription according to current pricing; multiple team member vesting contracts may need alternative/paid plan.
- No auto-claim by default; verify manual claim UX and actual fee/rent. Actual transaction behavior, cancellation and recipient transfer restrictions MUST be proven in non-mainnet tests using supportable vendor environment.

**Fallback if no audited affordable escrow is chosen:** hold founder allocation separate and disclose explicitly as **unvested, multisig-custodied, discretionary release**; do NOT claim it is locked. For a public release that represents founder tokens as genuinely locked, **NO-GO** until real on-chain timelock proof exists.

## 3. Small founder teams — Signer governance with Squads v4

Candidate platform: https://docs.squads.so/main/getting-started/quickstart-guide
Program v4 verified source: https://github.com/Squads-Protocol/v4

Recommended genuine **2-of-3 among three independently controlled key holders**:
- Signer A: founder — isolated **hardware signing key**, proposes/approves and is accountable.
- Signer B: independent trusted finance/operations reviewer — separate hardware signer/device and secured recovery.
- Signer C: independent technical/security or external fallback reviewer — separate custody; clearly documented fallback responsibilities.
- All three must be genuinely independent people/custodians to claim multi-person governance. If founder controls two keys, 2-of-3 protects against one lost device but **founder can still unilaterally approve asset movements**; disclose as multi-device custody, NOT independent oversight.
- Alternate 2-of-2 (founder + one independent) has no tolerance for unavailable or lost signer and can permanently trap treasury assets; use only if continuity plan exists.
- **No secure independent co-signers currently confirmed = governance proposal, not deployed security.** Keep public LP launch blocked; no one-person control falsely labeled 2-person approval.
- No individual unilateral \`configAuthority\`; use **autonomous Squads**, config changes by quorum (Squads describes controlled multisig admin override risk): https://docs.squads.so/main/development/reference/controlled-multisigs
- Transaction time lock candidate **24 hours** for treasury decisions when implemented, except planned emergency treasury freeze/change procedures; requires end-to-end testing.
- Disable/omit spending-limit bypass while reviewing security. Squads "spending limit" lets authorized members move capped assets without threshold for each expense. Do not represent off-chain budgets as on-chain spending limits: https://docs.squads.so/main/navigating-your-squad/settings/spending-limits
- Rotate compromised members and test signer recovery using empty Devnet vault; 2 lost keys out of 3 can make 2-of-3 unoperable.
- Publish vault PUBLIC address but NEVER members' private keys / recovery material; publish who can sign, threshold, roles and verified spend proposals without exposing private data.

### Squads price and vault architecture alternatives

According to latest app pricing: https://docs.squads.so/main/getting-started/pricing
- Basic **$0/month**, **0.1 SOL** one-time smart-account creation fee (plus network costs). Basic vault management available.
- Pro **$49/month**: advanced features such as **Sub-accounts, Spending Limits and Permissions** through the UI; do not claim Basic offers these screens.
- **Lowest monthly expense option:** One Basic Squads vault for 25m Development + 10m Operations, with GitHub accounting ledger splitting 25/10 but one underlying authority and spendable combined 35m. This is not independent on-chain segregation and should be described honestly.
- **Stronger on-chain separation with no subscription:** Two separately created Basic Squads vault accounts, with two independent addresses. Approx. **0.2 SOL initial app creation fees total**, extra network/rent, no fixed subscription. Both vaults could have the same independently controlled 2-of-3 signers, but the assets are segregated by account; approvals aren't automatically independent policies.
- **UI convenience / operational scale option:** One Squads Pro, $49 monthly where actual paid tier capabilities and cancellation consequences must be independently confirmed at procurement time. This is NOT the preferred default for zero-cost maintenance.
- Squads warns that the actual **vault address** and multisig configuration address differ; deposit to the vault, never unverified config address: https://docs.squads.so/main/additional-resources/key-aspects-of-using-a-multisig
- Account creation must only happen AFTER owner approves cost and custody terms.

## 4. Development 25m + Operating 10m spending policy proposal

**Do not confuse tokens with operating cash:** 25m/10m YORBI are reserve inventory, not 25m/10m USDC. No promised cash runway/borrow or ability to sell reserves at an arbitrary initial spot price. Use separate fiat/USDC operating budget sourced lawfully, reviewed for accounting and disclosure.

Proposal structure:
- **DEV_VAULT** (25,000,000) for documented external code, security, creator IP rights and product development milestones, not founder salary (which must be a distinct and disclosed budget line).
- **OPS_VAULT** (10,000,000) for legitimate operations: content moderation, verified legal/tax review, security response, hosting and explicit incident costs.
- **Approval flow**: scope/recipient invoice -> proposal with max token/USDC amount and wallet -> independent reviewer confirms price/recipient and approved quarterly cap -> quorum vote -> optional 24h delay -> execute -> verify Solana signature/balance -> record GitHub ledger.
- **Proposed per-period control**: first 90-day YORBI reserve outflow limit **zero by default** while issuer/legal/price plan unresolved; subsequent quarterly limits need independent approval and objective expense milestones. A whitepaper can communicate an indicative multi-year budget but must not promise on-chain lock unless programmed.
- Exceptional spending requires fresh case-specific user authorization, even if existing token vault quorum passes.
- Treasury moves **to DEX, market sale, new wallet, cross-chain bridge, or personal hot wallet** always need case-specific approval plus legal/tax check. No blanket authorization.
- Founder's grant claim itself is not a company expense or treasury approval event once genuinely vested according to deployed contract; business reporting still lists unlocked releases.
- Quarterly and monthly public summaries: treasury balance, vested/unvested founder amount, new grants, actual outgoing transfers, signer changes, cost, LP custody, and discrepancies. Do not publish private beneficiary details beyond necessary public keys.

No mixing of founder and operations funds, even for unpaid founder contribution, without clear independent accounting and approved compensation.

## 5. Practical cost envelope (planning only, variable)

| Plan | On-chain governance | Vesting | Minimum indicative platform/setup expense (before token mint & LP, dynamic) |
| --- | --- | --- | --- |
| Solo pre-launch documentation | Cold wallet + documented manual controls, no claims of multisig/vest | None, no on-chain claims | No paid tools — **not enough for claimed locked public launch** |
| **One Basic Vault + Streamflow** | One $0/mo basic vault for 35m plus 25/10 public accounting | One founder 20m vest, non-cancelable candidate | About **0.1 SOL + 0.1747 SOL = 0.2747 SOL**, plus 38,000 YORBI and other network fees |
| **Two Basic Vaults + Streamflow** | Separate 25m / 10m on-chain vault addresses; no subscription | Same founder vest | About **0.2 SOL + 0.1747 SOL = 0.3747 SOL**, plus 38,000 YORBI and other network fees |
| Pro with extra tooling | Advanced sub-accounts/limits/permissions | Same | Pro at **$49/month**, applicable other fees and vesting costs; not preferred on tiny runway |

These **do not include** Raydium pool creation (~0.2 SOL separate), real USDC liquidity, initial mint/Metaplex, SOL network variance, hardware signers, legal/security audits, insurance, or tax/accounting. Vendor prices change. User must approve the actual live quote prior to any funding.

## 6. Security and acceptance checklist

- [ ] Founder 20% / DEV 25% / OPS 10% etc **separately approved by user**; no implicit adoption of Tokenomics A.
- [ ] Founder/team attribution documented (20% is a pool, not necessarily 100% personal if future builders exist).
- [ ] Genuine independent signers confirmed; hard wallet and recovery rehearsed with non-sensitive test accounts.
- [ ] Quorum 2-of-3 and no individual unilateral config authority confirmed; transaction delay, delegated spending limits documented.
- [ ] Devnet vault vault-vs-config addresses verified; test threshold vote, member loss and rejected transfer.
- [ ] Vesting provider program ID, fee schedule, escrow balances and recipient/cancel/change options independently verified.
- [ ] Vesting schedule verified as **0 pre-cliff, 20m by month 36**, exact period timestamps and rounding established.
- [ ] Token-denominated vesting fees included **inside** final fixed-supply manifest; never mint excess.
- [ ] Dev/ops on-chain separation clearly distinguished from **one vault + public ledger only**.
- [ ] Treasury spending caps identified as actual on-chain constraints OR manual governance only.
- [ ] No LP sale, token treasury sale, investor distribution, issuer-specific public rewards without legal review.
- [ ] Solana original SPL + Metaplex Devnet is STILL UNTESTED; existing Token-2022 success only validates other program.
- [ ] Any real mainnet mint/fee payment/escrow creation/vault funding/lock/revoke occurs only after separate explicit sign-off. No current authorization.

## 7. Suggested approval gates (none satisfied yet)

1. **G1-C**: Owner explicitly approves founder 20% vs other allocations, token lock model, fees and signer independence as only a planning decision.
2. **G2-C**: Non-mainnet Squads/vesting compatibility demos and an independent security review; publish test results but no seed phrases.
3. **G2-BUDGET**: Written pre-execution cap for actual SOL fee, YORBI vendor fee and future USDC financial commitments.
4. **G3-MINT**: Mainnet mint and supply approval separately, after legal review.
5. **G3-ESCROW**: Individual permission to deposit mainnet 20m into specific audited contract and sign; test exact recipient, amounts, irreversibility.
6. **G3-TREASURY**: Individual permission to establish/fund project vault(s), validate custody and approvals.
7. **G3-LP**: Separate USDC/YORBI liquidity deposit only after formal legal, pool and financial gate.
8. **G3-PUBLIC**: Separate final approval of official marketing and addresses.

**Sources**:
- https://docs.squads.so/main/getting-started/pricing
- https://docs.squads.so/main/navigating-your-squad/treasury/sub-accounts
- https://docs.squads.so/main/navigating-your-squad/settings/spending-limits
- https://docs.squads.so/main/development/reference/controlled-multisigs
- https://docs.streamflow.finance/en/articles/9675153-individual-vs-business-costs-of-using-streamflow
- https://docs.streamflow.finance/en/articles/9670413-create-a-vesting-contract
- https://docs.streamflow.finance/en/articles/9674831-cancel-contract
- https://docs.streamflow.finance/en/articles/9670549-transfer-contract
- https://solana.com/docs/tokens/basics/set-authority
