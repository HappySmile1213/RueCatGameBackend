
export const TOKEN_AMOUNT = process.env.TOKEN_AMOUNT ? parseInt(process.env.TOKEN_AMOUNT) : 1000;
export const TOKEN_MINT = process.env.TOKEN_MINT ? process.env.TOKEN_MINT : '';
export const TOKEN_DECIMAL = process.env.TOKEN_DECIMAL ? parseInt(process.env.TOKEN_DECIMAL) : 6;
export const GAME_INTERVAL = process.env.GAME_INTERVAL ? parseInt(process.env.GAME_INTERVAL) : 500;
export const NETWORK = process.env.NETWORK ? process.env.NETWORK : 'devnet';
export const RPC_URL = process.env.RPC_URL ? process.env.RPC_URL : 'https://api.devnet.solana.com';
export const GAME_PROGRAM_ID = process.env.PROGRAM_ID ?? '';
export const SLOT_INTERVAL = 400;
