# YORBI Mainnet Legal / Security / Liquidity Risk Register v0.1

> **DRAFT / INFORMATIONAL / NOT LEGAL ADVICE** — as of 2026-10-11
> No formal legal opinion, actual token sale, mainnet deployment, payment or LP transfer has occurred.
> For public disclosure, remove private personal and business details; avoid publishing signing keys.

## 1. Applicable Korean law and pre-launch legal questions

The current Korean **Virtual Asset User Protection Act (가상자산 이용자 보호 등에 관한 법률)** version is effective **2026-10-02** (Law No. 21857). Official source: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=290735 .

Article 2 defines virtual assets and virtual asset service providers, including specified buying/selling, exchange, custody and brokering functions when operated as a **business**. Merely creating a token does not on its own answer whether an activity is a regulated VASP, offering of securities, or otherwise prohibited. The real conduct and business model must be analyzed: marketing to the public, direct token distribution/sales, operating trading infrastructure, operating custody, collecting funds, and creating/liquidating an LP.

Financial Services Commission announced in July 2026 that enforcement against virtual asset market manipulation and unfair trading continues. Official source: https://www.fsc.go.kr/po010106/87357 .

**No public sale or distribution approval** until a Korean qualified attorney reviews and records:

1. Legal operating person/entity, residence, funding sources and accounting registration.
2. Token's rights (revenue/share/repurchase/interest/dividend/voting) vs rights-free functional asset; security classification under the Capital Markets Act.
3. Whether direct or indirect Korean ICO/public solicitation/distribution would be restricted or carry regulatory risk; verify current guidance independently, not just a 2017 headline.
4. Whether issuer manages assets of others, runs exchange/broker, or receives compensation for third-party transactions so any VASP reporting, AML, travel-rule, KYC duties could apply.
5. Initial LP funding, subsequent company inventory sales, self-dealing/wash-trading/manipulation, insider information and market-making conflict policies.
6. Tax/VAT/corporate or individual treatment for issuance, USDC treasury, LP contributions, swaps, fee income, asset write-downs, holder rewards.
7. Marketing disclosures and risk statements in Korean/English; consumer protection, unfair promotion and influencer payments.
8. IP and brand title/rights, ownership of official mascot graphic and symbol confusion.
9. Resale, cross-border users, handling of personal data and accounting evidence.

Global X content or DEX accessibility can create international law questions. If soliciting **EU** users or pursuing admission to trading there, EU MiCA may require an offering/admission white paper and associated safeguards, with nuanced exemptions. An exemption for a free giveaway cannot be assumed when admission to trading is promoted. See https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-4-offers-public-crypto-assets-other and https://www.esma.europa.eu/publications-data/questions-answers/2671 .

**Legal gate outcome options:** GO only for a lawyer-reviewed specified scope; NO-GO until review; ALTER scope such as no sales and no targeted jurisdictions. Approval for a technical token mint is not legal clearance to publicly market/sell.

## 2. Threat register and controls

| Risk | Severity | Preventive control | Evidence for gate |
| --- | --- | --- | --- |
| Unintended additional mint supply / dilution | Critical | Fixed supply; account-by-account allocation proof; revoke mint authority only once distribution validated | Actual explorer mint state, mint authority null and supply proof |
| Malicious freeze, seize or transfer restrictions | Critical | Freeze Authority null; no permanent delegate, transfer hook, tax, blacklist or non-transferable extensions | Mint extension and freeze check plus Raydium compatibility test |
| Irreversible metadata errors | High | Final English/Korean name, artwork, rights, URI availability/content-addressed hash; role separation of metadata update authority | Independent URI/media checksum and wallet render screenshots |
| Admin signer theft | Critical | New dedicated mainnet wallet, hardware signer, multi-approval treasury where feasible; separate day-to-day hot wallet; no GitHub secrets/private keys | Non-secret wallet roster and approved recovery drill |
| False token / counterfeit mint | Critical | Public list of exact chain/mint/pool, mirrored after actual deployment only; monitor impostors | Official links with independently verified hashes |
| Premature launch / accidental real SOL transfer | Critical | Mainnet-only scripts on segregated branch, sign/tx simulation, human review; no auto-execution from GitHub Actions | Explicit owner approval containing exact destination, value and operation |
| Thin LP and sandwiched/MEV execution | High | Launch quote-depth impact scenarios, minimum user-friendly liquidity threshold, monitored slippage | LP quote depth and pre-launch swap simulations |
| Pool rug/conflicting LP holder claim | Critical | Document LP ownership and withdrawal ability, audited lock/Burn & Earn configuration or honest multisig custody disclosure | LP token proof, lock proof where actually locked |
| LP impermanent loss / inventory drain | High | No guaranteed returns or peg promises; treasury caps, transparent reserve policy | Signed financial risk acceptance |
| Inaccurate circulating-supply/vesting claims | High | Locked escrow with verified vesting where feasible; separate supply/circulation report | Escrow transaction and vesting program checks |
| Token-2022 wallet/router incompatibility | High | Test actual selected metadata extensions on DEX CPMM, major wallets and aggregators; fallback standard SPL+Metaplex | Compatibility matrix, recorded failures |
| Legal breach / unauthorized publicity | Critical | Scope opinion and sign-offs, no presale, hidden influencer or promised returns | External professional memo and approved compliance checklist |
| Insider manipulation, wash volume, misleading tweets | Critical | No self-trading volume farming; enforce disclosed related-party inventory/LP changes; honest development reporting | Monitoring and conflict-of-interest policy |
| Inadequate emergency response | High | Incident triggers, roles, ability/limits on LP access, public alert template, no guaranteed refund | Rehearsal and incident runbook |

## 3. Segregation of duties and budget control

- **Admin/Mint operations:** dedicated mainnet signer(s), ideally hardware with secondary recovery. Never the temporary GitHub Actions account.
- **Treasury:** separate documented custody and two-person approval for token/inventory transfers when feasible.
- **LP operator:** wallet for adding liquidity; clear record of LP tokens and limitations on withdrawal/lock rights.
- **Devnet holder:** previous public Phantom wallet can remain for experiments but do not assume its Devnet 1,000 YORBI-T is a mainnet holding.
- Every actual spending request must specify asset, amount, network, program/mint, recipient, purpose, estimated max network fee, cancellation/irreversibility, and named approver. **No signed transactions in this PR.**

## 4. Launch Go/No-Go checklist

- [ ] Legal entity/operator, jurisdiction, marketing scope and local counsel review signed off.
- [ ] Mainnet token standard, supply, allocation, vesting and initial circulation approved.
- [ ] Mint/Freeze/metadata authority plan and wallet custody roles approved.
- [ ] Token metadata image/JSON stable and independently checked.
- [ ] Devnet two-wallet issuance, transfer, negative-case and authority tests documented; DEX router compatibility tested.
- [ ] Initial liquidity threshold and slippage budget explicitly justified, no FDV or return promises.
- [ ] Exact current Raydium fee and account-rent estimate simulated; worst-case SOL and USDC limits approved.
- [ ] LP receipt/lock/burn and holder withdrawal rights known and disclosed.
- [ ] Security reviewer (independent if material funds) findings closed or accepted explicitly.
- [ ] Mainnet mint and fund deployment approvals separately obtained.
- [ ] No financial movement, official X post or production deployment until new authorization.

## 5. Official technical/legal references

- Solana token authorities: https://solana.com/docs/tokens/basics/set-authority
- Token-2022 metadata: https://solana.com/docs/tokens/extensions/metadata
- Raydium CPMM allowlisted extensions: https://docs.raydium.io/products/cpmm/overview
- Raydium protocol and pool creation fees: https://docs.raydium.io/ray/protocol-fees
- Raydium pool steps and inventory depth guidance: https://docs.raydium.io/user-flows/create-cpmm-pool
- Korea current law: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=290735
- FSC 2026 enforcement: https://www.fsc.go.kr/po010106/87357
- EU MiCA Article 4 for cross-border public offers: https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-4-offers-public-crypto-assets-other
