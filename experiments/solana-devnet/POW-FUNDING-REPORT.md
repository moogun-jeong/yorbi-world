# YORBI Devnet — PoW funding verification report

**Status:** BLOCKED / VERIFIED (2026-10-11), **no tokens minted**.
**Environment:** GitHub Actions, Node.js 22, ephemeral memory-only signers, Solana Devnet exclusively.

## Previous issuance failures
- [Original Actions run #1](https://github.com/moogun-jeong/yorbi-world/actions/runs/38116820927): malformed workflow YAML; corrected in PR #2.
- [Original Actions run #2](https://github.com/moogun-jeong/yorbi-world/actions/runs/38118023849): Devnet RPC faucet returned HTTP 429 Too Many Requests on 1, 0.5 and 0.2 SOL requests. Script exited **No mint created**.

## PoW client/source audit
- Official Solana Faucet and Cookbook recommend the `devnet-pow` tool maintained by Ellipsis Labs.
- `jarry-xiao/proof-of-work-faucet/cli/src/main.rs` explicitly checks whether fee payer has < 5,000 lamports and then attempts conventional `request_airdrop(1 SOL)`. Thus **PoW is not a zero-balance bootstrap mechanism**.
- `programs/proof-of-work-faucet/src/lib.rs` requires a transaction payer signer; PoW reward is paid to that payer once proof is accepted.
- YORBI's proof-only stage reproduces the on-chain PDA derivation and claims through the tested web3.js SDK; no historic Rust CLI needs installing.

## Funding-only GitHub verification
### PoW Funding Probe
- [PoW prerequisite run #1](https://github.com/moogun-jeong/yorbi-world/actions/runs/38118855106): SDK installation success; syntax check success; **6/6 unit tests pass**.
- The selected official documented three-A PoW faucet, difficulty 3 and reward 0.02 SOL, resolved to source address `6yvwhesLJeE8fNWviosRoUtBP3VFUXE7SEhSP9fFRJ3Z`.
- Source account on Devnet at test time held **0 lamports**; job ended with `BLOCKED: POW_FAUCET_EMPTY` **before any funding attempt or token transaction**.

### Read-only PoW source inventory
- [Read-only inventory run #1](https://github.com/moogun-jeong/yorbi-world/actions/runs/38118919917): GitHub workflow **SUCCESS**; on-chain faucet source inventory ran without signing or sending transactions.
- Found **23 PoW faucet specifications** owned by the expected PoW program.
- **22** were insufficiently funded for their configured reward. Exactly **one** has enough to pay its configured reward of **100 lamports**, but 100 lamports is below a typical 5,000-lamport transaction fee, so it is not practically useful.
- Practical candidate count: **0** (defined conservatively as difficulty ≤ 3, reward ≥ 0.005 SOL, and source balance ≥ promised reward).
- Two PoW faucet source addresses listed on the official faucet monitor were also empty at inspection (`6yvwhes...` and `2pekXzx...`).
- Do not repeatedly mine or request faucet funds while this gate is blocked. Balances can change; recheck read-only before attempting another workflow.

## Security and next action
- Zero real SOL / fiat spent. User's Phantom public address was not used in this funding-only verification.
- No YORBI-T mint, transfer, metadata transaction, or authority revocation executed. No test token address / transaction signature exists.
- Keep PR #2 as draft; **do not merge the experiment workflows into production main**.
- A later attempt needs a funded PoW source *and* a fee-payer bootstrap source. Funding must be verified before any issuance.
- Alternative without real money: user-controlled Phantom Devnet wallet receives test SOL from a legitimate faucet after user authentication, then user signs a browser-based test issuance. No seed phrase or private key should ever be sent to ChatGPT or GitHub.

## GitHub references
- [PR #2](https://github.com/moogun-jeong/yorbi-world/pull/2)
- [Solana Foundation faucet](https://faucet.solana.com/)
- [Solana developer cookbook](https://solana.com/developers/cookbook/development/airdrops-and-faucets)
- [PoW source](https://github.com/jarry-xiao/proof-of-work-faucet)
