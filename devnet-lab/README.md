# YORBI Phantom Solana Devnet Web Lab
STATUS: **CODE / DRAFT PR ONLY. No deployment or token issuance completed.**
Solana Devnet-only Phantom signing demo for public wallet `5nhZYYpyrB8gMtmqBBSREyNTdn62u8QEo2T1mV8W4ckc`.
## User preparation
1. Phantom app > Developer Settings > Testnet Mode > Solana Devnet.
2. Request free Devnet SOL using https://faucet.solana.com/ (aim 0.05 SOL; UI requires >=0.03 to create mint).
3. iOS: use Phantom **in-app browser**, not Safari, to open deployed HTTPS URL.
4. User explicitly signs each transaction, no seed phrase/private key required.
## Developer use
```bash
cd devnet-lab
npm install --ignore-scripts --no-audit --no-fund
npm test
npm run build
npm run dev
```
Generated `dist/` can be served on free HTTPS static hosting; production deployment requires separate user review and verification.
## Stages
Connect + Devnet genesis verification > verify faucet balance > mint+metadata (Token-2022) > user approves 1,000 YORBI-T > optionally send 10 to another wallet > irreversible mint authority revocation after user approval > read back supply/authorities. Only public Mint Address is stored locally for retries.
### Safety
- RPC hardcoded to Solana Devnet and exact user's Phantom public key.
- Metadata temporarily points to PR #2 experiment branch JSON; preserve URL until testing finishes, or migrate to permanent HTTPS before real test mint.
- Mobile Phantom wallet support requires actual testing; passing npm tests/build is **not** evidence of on-chain minting.
- No mainnet deployment, no real funds, no DEX, no sale, no wallet secrets.
