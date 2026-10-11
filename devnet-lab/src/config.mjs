export const RPC='https://api.devnet.solana.com';
export const DEVNET_GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export const RECIPIENT='5nhZYYpyrB8gMtmqBBSREyNTdn62u8QEo2T1mV8W4ckc';
export const NAME='YORBI Devnet Trial', SYMBOL='YORBI-T', DECIMALS=6;
export const INITIAL_SUPPLY=1000n*(10n**6n), TRANSFER_AMOUNT=10n*(10n**6n);
export const MIN_LAMPORTS=30_000_000;
export const URI='https://raw.githubusercontent.com/moogun-jeong/yorbi-world/experiment/yorbi-devnet-genesis-20261011/experiments/solana-devnet/metadata/yorbi-devnet.json';
export const EXPLORER='https://explorer.solana.com';
export function assertDevnet(hash){if(hash!==DEVNET_GENESIS)throw Error('차단: Solana Devnet 네트워크가 아닙니다.')}
export function assertKnownWallet(addr){if(addr!==RECIPIENT)throw Error('등록된 Phantom 수신 지갑 주소와 다릅니다. 계정 선택을 확인하세요.')}
export function assertBalance(n){if(!Number.isSafeInteger(n)||n<MIN_LAMPORTS)throw Error('무료 Devnet SOL 잔액이 부족합니다. 0.03 SOL 이상 확보하세요.')}
export function tokenUrl(mint){return EXPLORER+'/address/'+mint+'?cluster=devnet'}
export function txUrl(signature){return EXPLORER+'/tx/'+signature+'?cluster=devnet'}
