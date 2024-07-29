import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
  Connection,
} from '@solana/web3.js';
import { GAME_PROGRAM_ID, RPC_URL } from './constants';

const connection = new Connection(RPC_URL, 'confirmed');
// const GAME_PROGRAM_KEY = new PublicKey(GAME_PROGRAM_ID);
const GAME_PROGRAM_KEY = new PublicKey(
  '9mxg6zi8WBuLrGQiw4DLNmGVAmvBRnjWD2KfVRfV6bt5',
);

export const getNewUserOfGame = async (
  lastCheckedSlotNumber: number,
  startTime: Date,
) => {
  const newUsers = [];
  let currentSlotNumber = 0;

  try {
    currentSlotNumber = await connection.getSlot('confirmed');

    console.log('last slot : ', lastCheckedSlotNumber);
    console.log('curr slot : ', currentSlotNumber);

    if (currentSlotNumber === lastCheckedSlotNumber) {
      console.log('no change');
      return null;
    }

    const signatures = await connection.getConfirmedSignaturesForAddress(
      GAME_PROGRAM_KEY,
      lastCheckedSlotNumber,
      currentSlotNumber,
    );

    for (const sig of signatures) {
      const tx = await connection.getParsedTransaction(sig, {
        commitment: 'confirmed',
      });
      const timestamp = new Date(tx.blockTime * 1000);

      if (timestamp <= startTime) {
        continue;
      }

      // console.log("timestamp : ", timestamp.toISOString());

      if (tx.meta.logMessages == undefined) {
        continue;
      }

      const logs = tx.meta.logMessages.filter((log) =>
        log.startsWith('Program log:'),
      );

      let address = '';
      let amount = 0;
      for (const log of logs) {
        if (log.includes('Deposit by:')) {
          const match = log.match(/Deposit by: ([a-zA-Z0-9]{32,44})/);
          address = match ? match[1] : null;
        }

        if (log.includes('Deposit amount:')) {
          const match = log.match(/Deposit amount: (\d+) tokens/);
          amount = match ? parseInt(match[1], 10) : null;
        }
      }
      if (amount && address) {
        console.log('address: ', address, 'amount: ', amount);
        newUsers.push({
          address: address,
          amount: amount,
          tx: sig,
          timestamp: timestamp,
        });
      }
    }
  } catch (error) {
    console.log('Failed to get tx information');
    return { newUsers: [], currentSlotNumber: 0 };
  }
  return { newUsers, currentSlotNumber };
};
