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
