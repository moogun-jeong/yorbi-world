# ✧ YORBI — Born Curious. Built to Evolve.

Official early-stage character website for **YORBI**, an original fictional digital being born in the AI era.

> **Genesis / Pre-token:** No YORBI token has been issued. There is no official YORBI token contract, presale, promised returns, confirmed exchange listing, full contract-security scanner, or active AI agent. The read-only DEX lookup, third-party security signals and limited Ethereum/Base wallet-transfer sampling are available.

## Official channel
- X: [@MeetYorbiAI](https://x.com/MeetYorbiAI)

## Current version

This is a **free, bilingual (English/Korean), static website**. It contains the YORBI origin story, YORBI Daily editorial notes, a working read-only Explorer beta, the evolution roadmap, and the project transparency notice.

- `index.html` — responsive website (HTML, CSS, bilingual UI and simple interactivity).
- `assets/explorer.mjs` — browser-side DEX Screener API request, exact address validation, non-trading market data display.
- `tests/explorer.test.mjs` — zero-dependency Node.js unit tests for parsing and safety guards.
- `assets/yorbi-character.webp` — web-optimized version of the **approved YORBI character artwork**, based on the original character board.
- No build tools, server, database, paid APIs, wallet connection, or blockchain transactions.
- Explorer beta supports **DEX market data only**. Full on-chain contract security checks, honeypot detection, wallet analysis and AI conversations are **not implemented**.

### Preview locally

Run from the repository root:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Current live deployment

Production URL: https://yorbi-world.arhyme.workers.dev/ (Cloudflare **Workers** static assets). New changes in this repository must be deployed through the connected Cloudflare project. Verify deployed assets and HTML after every push.

## Optional alternative hosting: Cloudflare Pages (current production is Workers)

1. Log in to [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git** (labels may differ). If you see a Workers-only repository wizard, use the **Continue to Pages** link.
3. Select GitHub repository **moogun-jeong/yorbi-world** and branch **main**.
4. Framework preset: **None**; build command: leave blank, or use `exit 0` if a command is required; output directory: **.** (repository root).
5. Click **Save and Deploy**. Cloudflare will issue the actual `*.pages.dev` URL; the address is not known until deployment succeeds.
6. Open the live page, test English/Korean switching, view the artwork on mobile, and test the X links.
7. Add the real website URL to the official X profile.

When Git integration is enabled, commits to `main` trigger Cloudflare Pages deployments automatically; no GitHub Actions workflow is needed.

Cloudflare guide: https://developers.cloudflare.com/pages/configuration/git-integration/

## Sprint A — Public website quality improvement (October 10, 2026)

- `assets/yorbi-hero.webp` is a clearer 880×795 web-optimized crop from the approved YORBI brand board; the earlier 300px mascot file remains as an archived asset.
- `assets/yorbi-social-card.webp` is the 1200×630 social sharing image, based on the same approved character design.
- Open Graph, X summary_large_image and canonical URL point to the public Cloudflare Workers hostname.
- Mobile navigation is accessible via a menu button (Escape key and outside click close it).
- English / Korean language selection is saved in localStorage when available; static roadmap and other missing UI captions are translated.
- Source verification is distinct from live mobile-browser and X social-crawler tests; confirm public behavior after auto deployment.

## Sprint B + C — Public credibility and visual polish (October 10, 2026)

- Proof Center now separates **LIVE** website, **NOT ISSUED** token, and **PLANNED / NOT LIVE** Explorer and AI talks.
- Official X, public GitHub change history, no-presale/no-airdrop warning, and explicit revision date in the footer.
- Roadmap marks Genesis as a publicly available **site** (not a fully complete community rollout); future items are marked not live.
- Added a lightweight YORBI orbit brand favicon (`assets/favicon.svg`).
- Increased mobile readability, text spacing, accessibility, hover details; animation honors reduced-motion preferences.
- Preserved original YORBI artwork, bilingual controls, no paid infrastructure, and the exact published X and Workers URLs.
- The X account's **Website** field must be linked manually by the owner; we do not modify or publish X posts in this sprint.


## YORBI Daily + Explorer Beta (2026-10-11)

**Daily:** Three first, dated, editor-reviewed discovery notes (contract identity, liquidity vs exit execution, and Genesis public build history), each linking to relevant source material. Entries are added manually: **this is not a daily automated publishing promise**. No X post has been made by this release.

**Explorer Beta:** Public read-only DEX pair lookup for Ethereum, BNB Chain (`bsc`), Base, and Solana, using the [official DEX Screener token-pairs REST API](https://docs.dexscreener.com/api/reference). Users select a chain and enter the **exact token contract address**. An optional PEPE-on-Ethereum button performs a real example lookup. The UI shows token identifier, selected highest-liquidity matching **base-token** pair, USD price, pair liquidity, 24h trading volume, price change, market cap, FDV, trades, timestamp, and a source link where provided.

### Correct interpretation and limitations
- **Prices belong to the matched base token**, not the quote token. Quote-only pairs are excluded from the presented token price.
- Liquidity is **pair liquidity**, not guaranteed exit cash, pool lock proof, or the sum of all liquidity.
- `marketCap` and `fdv` are distinct data fields; missing data is displayed as `—`, never guessed as 0.
- No contract inspection, honeypot detection, source verification, creator tracing, insider analysis, CEX listing predictions, wallet connection, automated trading, AI analysis, or financial advice is provided.
- The browser accesses an external public REST API only when the visitor initiates a lookup. There is **no paid key, server, database, private wallet data or background polling**. Provider network/CORS restrictions may block some browsers and will show an error message instead of invented numbers.
- The most recent public lookup may be stored locally in the visitor's browser for up to 12 hours to recover from navigation; no search history is uploaded to a YORBI server. The external provider necessarily sees each requested token/chain and network request metadata. Free API usage is subject to its own rate limits and availability.
- YORBI itself **has no issued official token**. Third-party tokens are examples only, not endorsements.

### Testing and verification

To run pure-function tests locally with Node.js 20+:

```bash
node --test tests/explorer.test.mjs
```

Then test the deployed page manually on desktop and mobile:
1. Change English/Korean, refresh, reopen mobile menu.
2. Open Daily notes and their external source links.
3. Choose Ethereum and click the PEPE example; verify displayed numbers are received from the provider and DEX Screener link opens the selected pair.
4. Enter an invalid address; confirm an error and **no** request.
5. Test an unknown but syntactically valid token; confirm **no results** is not portrayed as proof of a nonexistent token.
6. Test failed-network messages and confirm no false "SAFE" judgement.
7. Ensure main X links, Proof Center and responsive layouts remain functional.


## Sprint 5 — Safety Scan (2026-10-11)

YORBI Explorer v0.2 adds a **read-only, third-party risk signal** panel. One token lookup triggers DEX Screener first and, when a matching base-token DEX pair is found, a browser-side GoPlus token-security request. It does **not** require wallets, API keys, paid hosting, a database or background polling.

- GoPlus EVM Token Security: Ethereum `1`, BNB Chain `56`, Base `8453`.
- Solana GoPlus Token Security (separate format): Token mint/freeze/close permissions, account freezing, mutable balance and transfer-hook indicators.
- EVM checks: GoPlus-reported honeypot, cannot-sell-all, mint, owner balance control, pausing, blacklisting, hidden owner, proxy, mutable fees, source verification and quoted buy/sell tax (GoPlus tax values are fractions: 0.1 = 10%).
- Holder distribution: sum of **provider-listed** top holder percentages and provider-reported holder count. Holder wallets may include DEX pools, locker contracts, burns, custodians and centralized exchanges. **It is NOT a developer holdings metric**.
- **LP lock and rug-pull status are NOT VERIFIED**; no automatic flag claims LP safety. A DEX pair's dollar liquidity also does not prove the LP is locked.
- Result labels strictly mean **risk signal detected**, **not flagged in that check**, or **unknown/unavailable**. There is **no SAFE score**. A missing, failed or blocked API call must never convert to a safe result.
- The GoPlus link opens the raw API response for manual comparison. GoPlus is a third-party source and can be wrong or incomplete. Browser CORS limitations, 429 rate limits, errors and timeouts are handled as **unknown**. The website makes no buy/sell, honeypot or AI investment claims.
- **Privacy:** a clicked lookup requests information from DEX Screener and GoPlus; those external providers see the requested chain/contract and normal network metadata. We do not intentionally save search histories on our server.
- **Current trigger:** security scan starts only after a valid token is found as a base token on a DEX pair. A token with no DEX pair does not get a security verdict in this version.

### Tests (Node.js 20+)

```bash
node --test tests/explorer.test.mjs tests/security.test.mjs
```

Manual mobile acceptance: select Ethereum, use the PEPE example and verify GoPlus analysis is loaded separately; switch language and ensure the results are not cleared; try unknown and invalid contracts; verify that any failed security API call is marked unknown, never safe. Verify the GoPlus raw response and DEX Screener references. If GoPlus CORS is blocked in real browsers, treat Safety Scan as **limited/unavailable**, not implemented successfully from the user's perspective, until a safe zero-cost backend path is arranged.


## Sprint 5.1 — Safety Scan mobile UX & interpretation (2026-10-11)

This release deliberately improves comprehension **without pretending any additional checks were performed**:

- Show reported risk flags in a dedicated priority section **before** the other checks.
- Default-collapse third-party flags that were **not detected** and any checks where the provider returned **unknown/missing**. All original indicators remain available via native accessible `details` sections.
- Scope the "unknown" count to **GoPlus fields returned by the provider**. An explicit always-visible notice clarifies that LP lock/rug risk, actual sell execution, current admin control and connected wallets remain **outside coverage**, even when provider unknown count is zero.
- Display truncated owner and creator addresses with chain-specific, validated explorer links: Ethereum → Etherscan; BNB Chain → BscScan; Base → BaseScan; Solana → Solscan. Copy buttons copy the **entire** underlying wallet address through the browser clipboard API, with accessible status/error feedback. Long addresses are never rendered unescaped into HTML.
- Explain when a zero-address owner is reported: potentially renounced ownership is **not proof that detected code permissions can or cannot be exercised**.
- Updates continue to support English/Korean, source links, small-screen layouts, third-party limitations and a zero-cost static Cloudflare Workers deployment.
- Unit tests increased to **16**, covering all earlier security behavior plus address abbreviation, safe explorer URLs, unknown-count scope and owner-vs-capability interpretation.

### Operational smoke test
1. On mobile, scan PEPE using the example: two GoPlus flags (as of the sampled data) should be at the top; the rest appear under a closed "not flagged" accordion.
2. Check the notice below the counters states that "unknown 0" is only for GoPlus fields, not LP/sell/admin/wallet coverage.
3. Tap each address's verified explorer link and copy button; confirm a complete address is copied. On HTTPS, clipboard usually works; browser permissions may block it and should show explanatory fallback.
4. Change EN/KO while results are visible. Check accordions and risk summaries translate without re-querying.
5. Scan another token with absent fields; missing checks must never be labeled "safe".
6. If a direct API request fails, display "unknown" instead of pretending the scan has passed.
7. Avoid claiming browser/device click success until manually confirmed; GitHub static checks do not simulate a complete mobile session.

## Sprint 6 — Evidence-first wallet radar (2026-10-11)

**Status:** Beta read-only, free on-demand **Ethereum and Base only**. BNB Chain and Solana transfer-history tracing are explicitly unsupported in this iteration. No paid backend, API key, wallet signature or blockchain transaction is involved.

### How it works

1. After an existing DEX token lookup, show a **Track wallet activity** button. Unlike Safety Scan, these requests are **not** sent automatically; visitors must choose to run wallet analysis.
2. Reuse the GoPlus **provider-reported creator address** from Safety Scan if available; this is *not* proof of the current owner or team.
3. Query a public per-chain Blockscout v2 explorer for token metadata and the **first page of up to 50 ranked holders**, skipping addresses explicitly labeled as contracts, exchange/service wallets, liquidity pools or known burn addresses when metadata permits. Select up to **3 remaining EOA-looking addresses**, but **an unlabeled EOA can still be a custodian, bot or service**.
4. Fetch up to the first **50 recent ERC-20 transfer log records** for each watched address, plus the reported token creator if available. Count only the **exact token's** inflows and outflows; direction and quantities are proof of **token movement**, **not proven market purchases or sales**.
5. Match exact token transfer events directly connecting the reported creator and those watched holder addresses and link to the original transaction. Shared routers, relays, Solvers or pools are **not evidence of common wallet ownership**.
6. Distinguish HTTP errors, rate limits, CORS restrictions, missing creator identity and pagination. Missing data never becomes a zero-sales assertion.

### Critical research limits
- **No actual DEX buy/sell classification**, swap tracing, fee-escrow claim provenance, profit calculation, token funding in native ETH, internal transfers, EIP-7702/4337 bundler traces or multi-hop connected wallet graph yet. Never label outgoing token transfers as "dumping".
- Holder counts and holdings are Blockscout's current observations; token transfer logs are historical samples, **not** a net portfolio change since launch and **not** a fixed 24-hour window. Sampling can omit older transactions.
- The creator (if reported) may be different from the controlling developer, token deployer, or owner. No contact details or real-world personal identities are inferred.
- Blockchain activity is public. The user's browser calls a public external Blockscout explorer and may expose requested addresses/network metadata to the provider. No persistent address monitoring or visitor-search storage is implemented by YORBI.
- **Provider availability is not guaranteed**: the public `eth.blockscout.com` and `base.blockscout.com` routes were sampled successfully, but public API rate limits, cross-origin policies or anti-bot protections can change.
- BNB Chain does not currently have the same verified public Blockscout mainnet instance. It must not be silently aliased to another chain. Solana needs an entirely different transaction parser.

### Tests
```bash
node --test tests/explorer.test.mjs tests/security.test.mjs tests/wallet-radar.test.mjs
```

**Mobile acceptance:** PEPE Ethereum → Explorer shows live DEX + GoPlus results → tap Wallet Radar → top holder candidates and creator show links and bounded transfer evidence; check exact token address and tx hashes; try Base and two unsupported chains; change language; confirm missing creator remains unknown; check that a direct token move is not called a purchase/sale; verify the status from a real browser before declaring full functional validation.


## Sprint 6.1 — Evidence review of DEX swaps and creator funding (2026-10-11)

**Status:** Implemented as an opt-in follow-up to Wallet Radar. No GitHub Actions, no paid API, no wallet permissions, no automated trading.

1. After Explorer → Safety Scan → Wallet Radar, click **Inspect transaction evidence**. This is a **separate manual action** that requests at most **six watched-address/transaction pairs**, sampling up to two recent nonzero token-transfer hashes per followed wallet.
2. Public Blockscout transaction details are inspected: successful execution, explicit swap method name and **opposite-direction ERC-20 quote asset movement involving the same watched address** must coexist to label a token receipt/spend as **DEX swap evidence**. Successful ordinary `transfer()` transactions remain **token transfers, not verified buys/sells**; swap signatures with missing payment or incomplete logs are **unclassified**. EIP-7702, multi-contract aggregators, native-ETH payment paths, internal traces, and bundler settlement may remain unclassified even when a real trade happened.
3. Where a GoPlus-reported creator is available, read its **first Blockscout outer transaction page** and show **positive native ETH value** sent directly to the three watched wallets by the creator. This is a **financial transaction link**, *not* proof of common ownership or the origin of funds. The page does not inspect internal/native transfers emitted by contracts or historic pages.
4. Each classification and observed creator→holder ETH transfer links to the raw Blockscout transaction and is explicitly a **bounded sample**. No historical total, profit calculation, complete attribution, DEX settlement proof, launch bundle audit, approval exploit detection, fee escrow source tracing, or multi-hop relationship network is claimed.
5. All browser requests use publicly accessible `eth.blockscout.com` or `base.blockscout.com` v2 APIs, triggered by the user's explicit button. Due to public rate limits, individual TX requests are sequential. The feature can take time or show **unavailable** for failed requests. No private keys, access tokens, or wallet signatures are used.
6. A true OVO-style forensic audit across proxy routers, native-asset settlement, gas funding, 7702 smart wallets and multi-hop related wallets remains **future work** and requires more exhaustive transaction decoding. The UI must not promise those capabilities.

Manual verification: scan PEPE Ethereum, inspect a holder's raw transaction. An ordinary `transfer` call must be labeled a transfer, never a buy or sell. For real swaps, require explicit swap call plus both token and quote payment from the watched wallet. Confirm the same chain/contract/tx reference before accepting a result. Test no creator, no pending transaction, API timeout, language switch and unsupported chains. Do not advertise end-to-end iPhone success until tested by the user.


## Sprint 6.2 — Swap-event context and clear evidence labels (2026-10-11)

**Scope:** Keeps the free, browser-only Ethereum/Base wallet analysis. No GitHub Actions, wallet signatures, paid APIs, backend, or persistent transaction history.

- Decodes canonical Uniswap V2 and V3 `Swap` **event topics** from the Blockscout transaction log endpoint for selected transactions. A matching event topic and opposite-direction ERC-20 movements involving the watched address are classified as **DEX-style swap context** and explicitly **NOT proof of that wallet's executed trade**. Logs can be emitted by untrusted contracts or may coexist with unrelated batch transfers.
- Stronger evidence remains **successful explicit swap method AND opposing tracked/quote ERC-20 movements involving the watched wallet**. Never infer buy/sell from standalone `transfer()` or general token movements.
- For large transaction batches, fetch up to **two pages** of token-transfer and relevant event logs when necessary. If pagination still remains, the record stays **unclassified** (`incomplete_logs`); never label a partial record as a definitive swap.
- Change raw internal classification codes (e.g. `no_explicit_swap_method`, `incomplete_logs`) into human-readable **Korean/English reasons**.
- Round-robin pick of up to two nonzero records per sampled wallet, preventing a single high-activity whale from dominating the six optional detailed transaction slots. Display `n / total` while sequentially checking transaction details.
- Maintain links to the original Blockscout transactions, creator funding distinctions, absence of full history, and careful unknown/no-evidence labels.
- This is **not an OVO-style complete forensic engine**. It does not resolve arbitrary router inner calls, Uniswap V4, native-ETH settlement within contracts, internal transfers, 7702/4337 bundles, team-controlled addresses, realized trading PnL, or multi-hop funding. A DEX-like event can be spoofed; treat it as context, not confirmation.
- Public API limits and delays can affect results. Browser fetches happen only on explicit button clicks; one optional deep review may use additional API calls but cannot incur GitHub Actions minutes.

**Tests:** `node --test tests/explorer.test.mjs tests/security.test.mjs tests/wallet-radar.test.mjs tests/wallet-evidence.test.mjs`

Mobile verification: after PEPE Explorer/Safety Scan/Wallet Radar, click the separate evidence-review button. Ordinary token `transfer()` should read "토큰 전송: 매매 미확인", unclassified transactions must show Korean reasons rather than raw internal codes, and events without sufficient proof remain labeled as context or unknown. Try an over-100-log batch, Ethereum/Base and unsupported chains. Verify links and language toggle; do not call a transaction verified solely on the presence of a `Swap` event.


## Sprint 6.3 — bounded router/native ETH trace and creator funding evidence (2026-10-11)

**Status:** An opt-in forensic *sample* in the existing Wallet Radar deep-review panel. Ethereum/Base only, no new service plan, server, database, API key, automation or GitHub Actions.

- Per explicit deep-scan click, inspect up to **six** watched-address/token transactions. For **at most three of those** with complete token transfer data, retrieve up to **two pages** of Blockscout `/api/v2/transactions/{hash}/internal-transactions` trace records. Consider only successful value-bearing traces with a matching originating transaction hash.
- A watched wallet receiving the tracked token and sending native ETH in the **same successful outer transaction**, or sending tracked token and receiving a native ETH internal call, is reported as **native settlement context**. ETH traces do not prove a DEX buy/sell or its actual economic owner. The outer `tx.value` is considered only if the watched address originated that transaction. A contract recipient is labeled "outer call to contract", not an identified DEX router.
- For the reported token creator, inspect its first page of outer transactions and optionally the internal traces for **at most the first three successful, creator-originated transactions** (up to two pages each). Show any positive ETH internal transfer to the watched wallets as either **creator directly sent ETH** or **creator-initiated transaction led to contract-mediated ETH receipt**. The latter is a *transaction/provenance relation*, **not a direct creator-to-holder transfer, same-owner proof, insider collusion or multi-hop wallet cluster**.
- Suppress duplicate trace records corresponding to an already listed direct outer ETH transfer when possible. Avoid inventing balances, routing profit, full funding histories, or exact trade counts from sampling. If the provider times out, has incomplete pagination, or omits traces, state **unknown/incomplete**.
- Sprint 6.2's swap-call attribution is tightened: to label a watched wallet's stronger swap-trade evidence, require **the wallet to be the successful outer transaction initiator**, plus an explicit recognized swap method and opposing ERC-20 movement. If an external router/bundler initiated the outer transaction, downgrade to **swap context**, not a verified buy/sell. Token transfers alone never prove buying or selling.
- Visible status advances during slow bounded trace lookup; raw transaction links remain available; English/Korean explanations are retained and the UI shows an extra contract-mediated funding sample.
- Non-goals: arbitrary router ABI recursion, fee-escrow provenance, complete internal call tree of all addresses, EIP-7702/4337 bundles, Uniswap v4-specific decoding, 24-hour trade statistics, CEX wallet affiliation, chain-wide related wallets, holder beneficial ownership, profit calculations or trustless liquidation tests.
- User browser directly calls the public **Blockscout REST v2** on demand. External providers see requested chain/address and network request metadata. The frontend can cache one public result in this browser for up to 12 hours for page restoration, without remote server storage. Free tiers / CORS / latency can limit access.
- **No GitHub Actions workflows are introduced**. Cloudflare Workers Builds remains the repository-connected deployment mechanism.

### Validation

`node --test tests/explorer.test.mjs tests/security.test.mjs tests/wallet-radar.test.mjs tests/wallet-evidence.test.mjs`

Mobile smoke test: scan PEPE (Ethereum), run Wallet Radar, then deep transaction review. Check progress texts, existence of the "Creator-initiated ETH receipts through contracts" panel, inspect transaction links, verify generic token transfers are not labeled buys, and confirm a missing trace is **not** reported as "no ETH funding ever". The bounded sample may find no funding links; that is a valid result. Confirm Base and EN/KO, and inspect from an actual mobile browser before marking end-to-end proven.


## Sprint 6.4 — fast evidence review and observed wallet link map (2026-10-11)

**Free and read-only:** No GitHub Actions, no paid third-party API, AI backend, database, wallet connection, signature, or submitted transaction. Supported wallet-tracing chains remain **Ethereum and Base**.

### Speed and reliability
- Prior Sprint 6.3 deeply inspected as many as six wallet/transaction pairs **sequentially**, including transaction details, token-transfer pagination, DEX-style log pages, ETH execution traces, then creator-originated ETH funding. This could take substantial time on mobile/free public APIs.
- Sprint 6.4 runs **at most two concurrent high-level jobs** (wallet transactions and creator trace), and **memoizes identical Blockscout URLs inside that individual scan**. Different watched wallets may use the same transaction hash; its transaction/trace details are requested once per URL, not once per wallet. The bounded reader caps requests at 64 unique URLs per scan.
- A new token lookup aborts the previous in-flight deep scan; stale results may not overwrite newer results. Each HTTP request has a 12-second timeout; 429/CORS/network failure is shown as unavailable rather than a verified zero or successful trade.
- Progress now reports completed high-level jobs; the response discloses distinct API request count and elapsed time. **No speedup percentage or latency SLA is claimed** until measured in actual devices and public providers.
- Existing bounds remain: **up to six sampled wallet/transaction pairs**, token/Event/internal trace pages at most two, creator's three recent outer transactions for ETH trace review, only the first 50 holder records and up to three watched holders.

### Evidence-only relationship map
- New responsive SVG map with **token creator (GoPlus provider-reported)** and up to **three sampled non-contract holder addresses** from Blockscout. **Nodes do not establish real-world ownership**.
- A graph arrow is drawn only with a **validated original transaction hash and a checked pair of addresses**, and each arrow is linked to the source Blockscout transaction:
  - **Direct ERC-20** transfer between creator and watched holder.
  - **Direct ETH** outer transaction or direct successful internal ETH transfer from creator to watched holder.
  - **Creator-initiated, contract-mediated ETH receipt**, distinct **dashed** arrow. The actual ETH sender contract is shown separately. This **does not** mean the creator directly paid the recipient or controls their wallet.
- Shared routers, token-holding similarity, exchange labels or coincidental same-pool activity create **no connection edges**.
- If no creator is identified or no edge is found in a bounded sample, the UI says **unknown / no evidence in sample**, never "no related wallets".
- Each user-triggered Wallet Radar run contributes direct token links. The optional user-triggered deep evidence review can additionally contribute direct ETH and creator-initiated contract-mediated ETH evidence.
- URLs are restricted to `https://eth.blockscout.com/tx/<64-hex-hash>` or `https://base.blockscout.com/tx/<64-hex-hash>`. SVG nodes and evidence labels use `textContent`, avoiding arbitrary content injection.
- No multi-hop clustering, beneficial-owner identification, decoded arbitrary router ABI, EIP-7702/4337 full execution, account attribution, insider manipulation, or complete transaction history is attempted.

### Checks and acceptance

Local unit suite (Node.js 20+):
```bash
node --test tests/explorer.test.mjs tests/security.test.mjs tests/wallet-radar.test.mjs tests/wallet-evidence.test.mjs tests/wallet-graph.test.mjs
```

Mobile smoke test: select PEPE on Ethereum, run Wallet Radar, then the optional deep transaction review. The "Observed wallet transfer map" shows the creator and sampled holder nodes; source arrows appear only when a direct ERC-20/ETH move or verified creator-initiated mediated ETH receipt was encountered. Inspect each linked hash on Blockscout. Verify that a zero-arrow PEPE graph does not imply unrelated wallets. Repeat with Base. Switch English/Korean. Start another token scan before a long deep review finishes and confirm the old results do not appear. Compare elapsed times cautiously with prior builds, since provider response time, rate limits and sampled transactions vary.


## Sprint 6.5 — sampled wallet timeline and portable reports (2026-10-11)

**Status:** Read-only, browser-only, zero extra data API calls beyond the existing Wallet Radar and optional deep scan. Ethereum and Base supported. **No GitHub Actions**, no service subscriptions, no persistent backend, no wallet connection or on-chain execution.

### Time-window summaries
- Receive the **already-fetched first-page ERC-20 transfer logs** for each observed wallet (maximum 50 records per wallet). Preserve source tx hashes, exact token matching, transfer direction, UTC timestamps and token quantity where parseable.
- Add a period selector for **last 24 hours / last 7 days / entire fetched sample**, measured against the timestamp at which Wallet Radar returned its sample. This filters the **limited fetched sample**, **not the chain's complete period history**. Never interpret "0 sampled events" as "0 market buys/sells."
- Group the matching transfer events by **UTC calendar date** and watched wallet. Display incoming/outgoing counts and approximate transferred token quantities, with invalid values explicitly counted as *unknown* rather than zero. Do not call transfers actual purchases or sales.
- After separate user-triggered deep evidence analysis, show **per-wallet counts of classifications already made by the previous Sprint** (explicit swap method + payment flow + initiating wallet, contextual swap, generic token transfer, unknown). These classifications are **not** filtered by the transfer timeline selector; the panel explicitly explains this. No additional DEX protocols or market transactions are magically authenticated by the report.

### Export and sharing
- A **Download sample JSON** button produces a portable, versioned `yorbi-wallet-sample-v1` file with chain/contract, reported creator if any, generated UTC time, time-window, sample limitations, grouped movement records, original Blockscout tx citations, bounded classification evidence and graph edges.
- A **Copy text summary** button copies a concise EN/KO summary for sharing. It does **not** generate a public link, upload a dataset or place wallets in a remote database.
- The latest browser-local analysis snapshot is retained for up to 12 hours so results can be restored, but server export remains an explicit user action; copied/shared records contain publicly visible wallet addresses and contract details. Visitors should inspect downloaded JSON before publishing.
- Updating the analyzed chain or token clears previous report state and evidence. Evidence/graph updates must match both chain and token contract to avoid stale classifications leaking between scans.

### Caveats
- No full-blockchain transfer traversal, wallet balance snapshots, trading profit estimates, realized sell receipts, linked-beneficial-owner identification, net exposure reconciliation or CEX order history is attempted. Any transaction snapshots are limited to the already fetched first pages (up to 50 ERC-20 movements per wallet) and the deep sample (up to six selected transactions).
- Free Blockscout API rate limits remain; new timeline and export features require **no extra network calls** on period change, report creation, copying or download.
- Automatic claims such as "developer sold 70%" remain prohibited unless separately decoded from complete, verified transaction evidence. No financial trade execution is implemented.

### Tests

```bash
node --test tests/explorer.test.mjs tests/security.test.mjs tests/wallet-radar.test.mjs tests/wallet-evidence.test.mjs tests/wallet-graph.test.mjs tests/wallet-report.test.mjs
```

Mobile acceptance: scan PEPE (Ethereum), run Wallet Radar, inspect the 24h/7d/sample time selector; inspect selected UTC dates and individual wallet inflows/outflows. Optionally run deep trade-evidence review and check the classified evidence counts. Download a JSON report and verify time/source addresses with public Blockscout transactions, copy the EN/KO text report and confirm no automatic server upload or publication (a 12-hour browser-local recovery cache is permitted). Re-scan a Base token and verify old evidence does not appear. Confirm source URL allowlist and no extra requests for period toggles. Device browser file download and clipboard success are **not established by static/unit tests**.


## Sprint 6.5.1 — recover recent scan after mobile popup, navigation or tab reload (2026-10-11)

**Motivation:** On mobile Safari and in-app browsers, closing an external transaction popup or returning from another view may reload the YORBI site, which previously stored lookup state only in JavaScript memory. The full Explorer/Safety Scan/Wallet Radar/Deep Evidence/Graph/Report UI could revert to its pre-lookup state.

**Fix:**
- Automatically cache the latest **public read-only lookup snapshot** in this origin's **browser localStorage**, where available; **12-hour expiry**, single recent analysis, maximum **650 KB**. This is browser-local storage, **not a YORBI server/database or network upload**. External providers see only existing user-triggered API calls.
- Persist successful **Explorer** DEX pair record, **GoPlus** interpreted risk report, **Wallet Radar** bounded holder/transfer sample, **optional deep evidence** bounded results and **time-window selection**. Any unsupported/oversize record falls back to basic Explorer and Safety Scan rather than storing partial potentially misleading deep results.
- On re-entering/reloading the same website origin, recreate the result cards from the cached **same chain/contract** and dispatch the existing in-page evidence events in dependency order to restore graph, report and deep classification. **No automatic re-query or new Blockscout/GoPlus/DEX API requests** are made during restoration.
- Keep the approximate **scroll position** and which detail accordions were open. A banner clearly states "**restored snapshot, not live prices**"; original query timestamps remain visible. The visitor may explicitly re-scan for fresh data.
- The new **Clear saved results** button removes the local cached snapshot and reloads the clean lookup page. Starting a new user-requested token scan invalidates the previous cache.
- Cached public wallet addresses, token contracts and transaction references are visible to anyone who can access the same browser profile. Users of shared devices should clear saved results, and private mode/storage-disabled browsers may not support recovery. Cross-origin in-app browser containers can have different storage and are not guaranteed to share cached results.
- This feature does **not** preserve streaming/incomplete API requests; only completed parts of the analysis are saved. It cannot guarantee preservation if an iOS browser process closes before the cache can be written, if device storage is cleared, or if the page is reopened in an isolated browser container.
- No wallet connection, authorization, transaction signing, backend, paid API, GitHub Actions workflow or account login is introduced.

Validation: Run the full existing unit suite plus `tests/scan-restore.test.mjs`; manually scan PEPE in mobile Safari, expand transaction evidence, open a Blockscout link, return to YORBI and check the same token, report, selected period, visible location and risk indicators. Force a full tab reload and check the restored notice. Check **Clear saved results**. Re-run a different token and ensure old contract evidence is never mixed in. No source-level test guarantees iOS popup/tab lifecycle behavior; confirm on device.


## Sprint 6.6 — Uniswap v4, ERC-4337 and EIP-7702 execution context (2026-10-11)

**Status:** Browser-only forensic **context** enhancement. Ethereum / Base wallet tracking only. No automatic trading, paid API, GitHub Actions, or new external accounts. Does **not** imply Robinhood Chain is supported: the previously investigated OVO was on Robinhood Chain.

- Add **canonical Uniswap v4** `Swap(bytes32 indexed id,address indexed sender,int128 amount0,int128 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick,uint24 fee)` topic `0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f`, **only** from recognized Ethereum/Base PoolManager `0x000000000004444c5dc75cb358380d2e3de08a90`. Distinct Pool IDs and PoolManager caller addresses are visible as evidence, but these do not identify the pool's currency pair or the ultimate wallet/trader. A received/sent tracked ERC-20 in the same successful transaction is marked **DEX v4 CONTEXT**, **never a confirmed buy/sell** or proof of causal relation.
- From known **ERC-4337 EntryPoints** v0.6, v0.7, v0.8, match `UserOperationEvent` topic `0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f` and its indexed sender topic to the watched address. It establishes the presence of a user operation concerning that account, **not** the identity of its owner, a completed swap, or a buy/sell. Ignore spoof events from other emitter addresses.
- Note outer transaction type `4` / `0x04` as **EIP-7702 authorization-format transaction context**. The watched wallet may be completely different from the outer signer and may have been authorized in an earlier transaction; do not conflate a 7702/type-4 transaction with proof that the watched wallet signed.
- Previously, transaction event logs were fetched only under specific heuristics. Now, when token-transfer logs are complete, fetch at most **two pages of event logs** for each of the at-most-six on-demand sampled transactions. The existing bounded concurrency=2 and deduplicated API calls, timeouts and abort handling remain. If events are incomplete or missing, do **not** assert a verified swap.
- Render protocol hints beneath individual transaction evidence cards; store them inside the existing browser-local 12-hour restoration snapshot. The JSON report and classified summary retain conservative swap-context categories rather than turning contexts into confirmed trades.
- **Not implemented**: direct Uniswap V4 pool-currency attribution from pool initialization; v4 fee hooks/custom accounting interpretation; cross-router profit or complete settlement; actual swap authorization/ownership from 7702; the full execution graph for 4337; Uniswap V4 swaps on unsupported chains; EVM chains without verified public Blockscout instances; historical launch-bundled buys; realized trading PnL.
- UI must present an unambiguous difference among **observed event / watched-wallet token movement / proven market trade**, with the latter not claimed for arbitrary router/smart-wallet transactions. Canonical event topic and known emitter reduce but do not eliminate transaction-level causation ambiguity.

**Regression tests:**
```bash
node --test tests/explorer.test.mjs tests/security.test.mjs tests/wallet-radar.test.mjs tests/wallet-evidence.test.mjs tests/wallet-graph.test.mjs tests/wallet-report.test.mjs tests/scan-restore.test.mjs tests/wallet-execution.test.mjs
```
**Mobile acceptance:** Open a valid Ethereum or Base token in Explorer → Wallet Radar → Inspect transaction evidence. Check each additional v4 Pool ID / ERC-4337 operation / 7702 label against original Blockscout transaction event logs; ordinary PEPE token transfers might show no new labels and that is expected. Previously saved scan results (12-hour local snapshots) will only include newly extracted 6.6 fields **after rerunning the deep inspection**. No iPhone runtime behavior is considered verified by unit tests alone.


## Sprint 6.7 — integrated risk indicators and evidence coverage (2026-10-11)

**Read-only, free, no new providers:** The combined panel reuses already-fetched DEX Screener / GoPlus / Blockscout data. No extra network request, wallet connection, API key, backend, database, GitHub Actions workflow, token launch or token safety rating is added.

- A new **Integrated risk & evidence review** appears with the token lookup. It refreshes incrementally as GoPlus, optional wallet tracking and optional deep transaction evidence become available. After a mobile reload, the existing 12-hour device-local snapshot restoration replay provides the same panel without new provider calls.
- **Selected DEX pair liquidity:** provider-reported USD liquidity is classified as "attention" under $20K, "review" under $100K, else "reported." These are **presentation thresholds**, not measured sellable exit liquidity, executable slippage or guarantees. Missing values stay unknown. Raw DEX Screener link is allowlisted.
- **Security indicators:** report actual checked GoPlus fields, risk flags and missing checks. A flagged admin function is not necessarily actively callable by a current owner, and no reported flags does **not** certify security. Never infer a verified absence of honeypot or a successful sell.
- **Holder concentration:** GoPlus-reported top N summed percentage uses 25%/50% *attention thresholds*, not attribution. LP, lock contracts, CEX wallets, burn addresses and custodians can be included; aggregate concentration must **never** be labeled "developer holdings."
- **LP lock / burn / liquidity rug prevention:** always unverified. Displaying liquidity is not verifying LP lock status. No new authority, creator control, LP rug or fee-escrow verification is implied.
- **Creator flows:** only a GoPlus **provider-reported token creator** (not verified current admin, owner or real-world individual) is associated with bounded Blockscout outgoing ERC-20 transfer records. Outgoing ERC-20 transfers **are not market sales**. Unknown transfer history means unknown, not zero trading.
- **Sampled swap evidence:** only when that same creator address appears in the separately inspected deep sample does the dashboard display its explicit swap-spend evidence (with Blockscout hash) or weaker router/V4 contextual transfer evidence. Uninspected creator records remain "unknown"; it does not infer lifetime sells, realized profits or related-owner wallets.
- Each separate evidence row states **provider-reported / on-chain sample / context only / unverified**, and flags attention/review/unknown independently. A global "SAFE" score, fraud verdict, buy signal, investment recommendation or issuer accusation is deliberately absent.
- Strict chain+token matching prevents stale saved wallet/deep records from being mixed with a different contract. Existing browser-local restore events are supported; no additional persistent data is stored.
- BNB Chain and Solana continue to receive DEX/GoPlus evidence where available but **not** Ethereum/Base-only wallet tracing. A missing tracing layer is shown as unknown rather than silently fabricated.
- When the selected provider data cannot be retrieved or public API throttling occurs, the summary stays unknown. No cross-provider "verified" claim can be inferred from one source.

Tests: `node --test tests/explorer.test.mjs tests/security.test.mjs tests/wallet-radar.test.mjs tests/wallet-evidence.test.mjs tests/wallet-graph.test.mjs tests/wallet-report.test.mjs tests/scan-restore.test.mjs tests/wallet-execution.test.mjs tests/risk-synthesis.test.mjs`

**Mobile verification:** Look up Ethereum PEPE; see liquidity, GoPlus flags/holder share, LP unknown, creator unscanned. Click Wallet Radar and then deep inspect; ensure creator outgoing transfers do not turn into sales without actual creator-address swap evidence. Follow source links, switch KO/EN, reload saved snapshot, and scan another token to confirm stale results are cleared. The on-device UI sequence remains to be validated by a real browser and is not established by pure logic unit tests.


## Sprint 6.8 — Moonshot growth observations and CEX listing-path transparency (2026-10-11)

**Status:** Read-only browser feature; zero additional market-provider API calls, zero GitHub Actions, no server-side history/paid service, no AI trading recommendation.

### Observable Moonshot metrics
- For a **user-triggered fresh Explorer token lookup**, take a source-scoped snapshot of the **selected highest-displayed-liquidity DEX pool** with chain+exact contract, lookup timestamp, market cap (when separately reported), FDV, selected-pair USD liquidity, **rolling** 24h pool trading volume, 24h buy/sell transaction counts, price, 24h price change and pool creation date.
- When a matching GoPlus Safety Scan result arrives for **the same chain and exact token** within 15 minutes, append its **reported holder count** to the same observation. Holder count is optional, not backfilled or assumed zero if GoPlus is missing. The history graph only uses valid, timestamped numbers.
- Browser `localStorage` key `yorbi:moonshot-snapshots:v1` retains up to **30 days**, max **48 observations per token** and **240 total**. Two snapshots less than five minutes apart for the same token are coalesced; percentage comparisons require an earlier observation at least **15 minutes** old. No fabricated 24-hour/7-day growth rate: display the **actual elapsed time between observed scans**, not a standard period.
- A separate 12-hour recent-result recovery feature remains in place. **Restoring cached results does NOT create a new growth observation.** A clear-history control only removes the selected token's local growth series; the separate clear-results control maintains its original behavior. Private/incognito storage may not survive tab closure.
- Market cap is **never silently replaced by FDV**; missing values remain unknown; zero-denominator growth has a computable absolute difference but **no percentage**. If the DEX source's selected pair changed across scans, **pair liquidity and rolling volume are NOT compared across the different pools**. Selected pool age is labeled as pool age, **not token launch age**.
- Simple browser SVG lines visualize only recorded market-cap and holder-count observations. No historical price/cap/provider chart data is fabricated for intervals that have not been recorded. Changing the language or rendering the previous report does not call any provider API.

### Listing-path status / limitations
- Display a conceptual path **DEX pair → small CEX → mid-size CEX → large/Tier-1 CEX → Binance/Coinbase**.
- The selected DEX pair is directly observed in the DEX Screener response, but **DEX-only status is NOT verified**. CEX market coverage is **not checked by any provider**, so **every CEX stage remains unknown**, not "not listed" or "upcoming." There are NO invented listing dates, probabilities, relationships, guaranteed routes or implied Binance/Coinbase listing.
- Future versions can introduce **exchange-specific source-backed market checks** after separately verifying API coverage and token/chain identity. Until then, this is a transparent roadmap of evidence gaps and does not estimate Remaining Upside or investment attractiveness.
- Thin liquidity and risk signals remain available independently in Sprint 6.7; this feature adds **no composite scam score, automated watch, profit target or buy/sell execution**.
- Public DEX Screener/GoPlus data can be stale, reported incorrectly or rate-limited; locally stored samples may be missing when a device clears browser data.

### Tests and acceptance
`node --test tests/explorer.test.mjs tests/security.test.mjs tests/wallet-radar.test.mjs tests/wallet-evidence.test.mjs tests/wallet-graph.test.mjs tests/wallet-report.test.mjs tests/scan-restore.test.mjs tests/wallet-execution.test.mjs tests/risk-synthesis.test.mjs tests/moonshot-growth.test.mjs`

On iPhone: (1) fresh PEPE scan displays one local observation and **no growth percent**, (2) GoPlus holder count appears only when provided, (3) re-scan at least 15 minutes later to produce an observed-time change, (4) test saved-snapshot reload does NOT invent additional growth observations, (5) inspect explicit "DEX-only unverified"/all CEX statuses unknown, and (6) clear this token's growth history and confirm it does not affect other token records. Verify English/Korean. Static/unit tests cannot prove iOS browser localStorage persists across different apps or isolated in-app browser containers.


## Development priorities
1. Ship and test Genesis page with zero recurring cost.
2. Publish honest character content and keep roadmap statuses accurate.
3. Validate real interest before paying for infrastructure.
4. Add a read-only, source-linked Token Scan only after chain/API coverage and security checks.
5. Defer token issuance and any trading features until a separate security, legal, and tokenomics review.

## Safety and transparency
- Do not commit wallet private keys, seed phrases, API keys, or personal account credentials.
- Do not display invented market prices, fake holders, fake audit results, or nonexistent token addresses.
- YORBI is fictional branding. Verify naming, ticker, trademark, and token-name conflicts before issuing any token.
- The character and website do not provide investment advice or guarantee any token launch or exchange listing.
