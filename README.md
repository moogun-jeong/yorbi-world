# ✧ YORBI — Born Curious. Built to Evolve.

Official early-stage character website for **YORBI**, an original fictional digital being born in the AI era.

> **Genesis / Pre-token:** No YORBI token has been issued. There is no official contract address, presale, promised returns, confirmed exchange listing, live token scanner, or active AI agent.

## Official channel
- X: [@MeetYorbiAI](https://x.com/MeetYorbiAI)

## Current version

This is a **free, bilingual (English/Korean), static website**. It contains the YORBI origin story, Discoveries/Explorer concepts, evolution roadmap, and the project transparency notice.

- `index.html` — self-contained responsive website (HTML, CSS, and small language-switching JS).
- `assets/yorbi-character.webp` — web-optimized version of the **approved YORBI character artwork**, based on the original character board.
- No build tools, server, database, paid APIs, wallet connection, or blockchain transactions.
- The Explorer and AI conversation concepts are **not implemented**.

### Preview locally

Run from the repository root:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Current live deployment

Production URL: https://yorbi-world.arhyme.workers.dev/ (Cloudflare **Workers** static assets). New changes in this repository must be deployed through the connected Cloudflare project. Verify deployed assets and HTML after every push.

## Free hosting: Cloudflare Pages, connected to GitHub

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
- No user search history is stored by our website. The external provider necessarily sees each requested token/chain and network request metadata. Free API usage is subject to its own rate limits and availability.
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
