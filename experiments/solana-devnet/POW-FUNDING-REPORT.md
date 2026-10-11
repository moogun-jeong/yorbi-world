# YORBI Solana Devnet — isolated PoW faucet funding validation

Status: **PROPOSED EXPERIMENT / NOT TOKEN ISSUANCE**

## Discovery

The Solana documentation and \`https://faucet.solana.com/\` point to \`devnet-pow\`.
Reviewing \`jarry-xiao/proof-of-work-faucet/cli/src/main.rs\` revealed that
the official-recommended client calls \`request_airdrop(1 SOL)\` if its fee payer
has fewer than **5,000 lamports**. The on-chain faucet \`airdrop\` instruction
also takes a transaction fee-paying signer. Proof-of-work is therefore **not
a zero-balance bootstrap solution by itself**.

Confirmed previous tests:
- Run #1: workflow YAML parsing error (fixed).
- Run #2: GitHub hosted runner's \`requestAirdrop\` returned HTTP 429; **no mint and no transfer**.

## New independent test

- \`pow-utils.mjs\`: PoW PDA derivation and safety gates.
- \`pow-funding.mjs\`: Devnet-only one-time stage:
  1. Confirm exact Devnet genesis hash.
  2. Read the PoW faucet spec and actual funded source balance.
  3. Make **one** minimal Devnet RPC bootstrap request for fee payer (0.002 SOL);
     this is required by the actual PoW instruction, not an optional workaround.
  4. Abort if bootstrap fails; **never mint tokens**.
  5. If funded, grind a three-A prefix proof, claim 0.02 DEVNET SOL from the
     on-chain faucet, and verify the increased Devnet balance.
- \`pow-utils.test.mjs\`: deterministic tests for chain gate, funding gate,
  PoW account metadata, and missing fee payer.

### Security and limitations

The fee payer and proof keys are generated **only in runner memory**;
no keys are written to GitHub, logs, artifact, secrets, or a user's computer.
The trial is isolated to a short-lived hosted runner.
If PoW funding succeeds, the resulting Devnet SOL is held by an ephemeral
signer and is unavailable after runner exit. A separate follow-on issuance
needs its own funding/signing plan. This PoW test **does not** trigger the mint
script or modify the official YORBI website.

PoW faucets can run out of funds, change parameters, be rate limited at the
RPC layer, or time out. Log actual on-chain proof, never declare success based
solely on a command completing.

## Pending evidence

Append the GitHub workflow run URL and concise measured status after execution.
