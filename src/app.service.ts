import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';
import { GameDocument } from 'schema/game.schema';
import { GameInfoDocument } from 'schema/gameinfo.schema';
import { GAME_INTERVAL, mintPublicKey, PROGRAM_ID, RPC_URL, TOKEN_AMOUNT, TOKEN_DECIMAL, TOKEN_MINT } from './constants';
import { getNewUserOfGame } from './solana';
import { exit } from 'process';
import { GameHistoryDto } from 'dto/gamehistory.dto';
import { BN } from "bn.js";
import bs58 from "bs58";

import { PublicKey, Connection, Transaction, Keypair, SYSVAR_RENT_PUBKEY, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, MintLayout, createBurnInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { bettingIDL } from 'idl/bettingIDL';

@Injectable()
export class AppService {
  private slotNumber = 0;
  private lastTime = 0;
  private busy = false;

  constructor(
    @InjectModel('game') private gameModel: Model<GameDocument>, 
    @InjectModel('gameInfo') private gameInfoModel: Model<GameInfoDocument>
  ) {
    this.lastTime = new Date().getMilliseconds();
  }

  async onModuleInit() {
    const existingGameInfo = await this.gameInfoModel.findOne();
    if( !existingGameInfo) {
      const initialGameInfo = new this.gameInfoModel({ 
        round: 0,
        minToken: 10000 * 10 ** TOKEN_DECIMAL,
        duration: 7 * 24 * 60,
        isManualFinish: false,
        lastSlot: 0,
       });
       await initialGameInfo.save();
    }
    this.updateGameInfo();
  }

  getHello(): string {
    return 'Hello World! ABC';
  }

  async transferToken() {
    const finishedGame = await this.gameModel.findOne({ gameStatus: 2 });
    finishedGame.prizeSend = true;

    await this.gameModel.updateOne(
      { _id: finishedGame._id },
      finishedGame,
    );

    return JSON.stringify({ message: 'Token transfer success' });
  }

  async getMinTokenAndDuration() {
    const gameInfo = await this.gameInfoModel.findOne();
    if (!gameInfo) return null;
    const min: string = gameInfo.minToken;
    const dur: number = gameInfo.duration;
    return { min, dur };
  }

  async setGameInfo(minToken: string, duration: string) {
    const gameInfo = await this.gameInfoModel.findOne();
    gameInfo.minToken = (parseInt(minToken) * 10 ** TOKEN_DECIMAL).toString();
    gameInfo.duration = parseInt(duration);
    await this.gameInfoModel.updateOne({ _id: gameInfo._id }, gameInfo);
    return JSON.stringify({ message: 'Success to set minimum tokens and duration.' });
  }

  async startNewGame(minToken: string, duration: string) {
    // First, change GameStatus as fully finished
    const finishedGame = await this.gameModel.findOne({ gameStatus: 2 });
    if (finishedGame) {
      finishedGame.gameStatus = 3;
      await this.gameModel.updateOne(
        { _id: finishedGame._id },
        finishedGame,
      );
    }

    const currentGame = await this.gameModel.findOne({ gameStatus: 1 });
    if (currentGame) {
      return JSON.stringify({ message: 'Previous round is not finished yet.' });
    }

    // update game information
    const gameInfo = await this.gameInfoModel.findOne();
    if( !gameInfo) return;
    // gameInfo.duration = parseInt(duration) ;
    // gameInfo.minToken = (parseInt(minToken) * 10 ** TOKEN_DECIMAL).toString();
    gameInfo.lastSlot = finishedGame?.lastSlot ?? 0;
    gameInfo.round += 1;
    await this.gameInfoModel.updateOne({ _id: gameInfo._id }, gameInfo);

    // start a new game
    const newGame = new this.gameModel({
      no: gameInfo.round,
      userList: [],
      txList: [],
      timeList: [],
      amountList: [],
      winnerList: [],
      prizeList: [],
      winnerHash: '',
      totalAmount: '0',
      startTime: new Date(),
      gameDuration: parseInt(duration),
      minTokenAmount: parseInt(minToken),
      gameStatus: 1,
      lastSlot: gameInfo.lastSlot,
      prizeSend: false,
    });
    console.log('saving');
    await newGame.save();
    return JSON.stringify({ message: '== New round is started ==' });
  }

  async finishCurrentGame(address: string) {
    while (this.busy) {
      await delay(50);
    }
    const currentGame = await this.gameModel.findOne({ gameStatus: 1 });
    if (currentGame) {
      this.selectWinner(currentGame);
      currentGame.gameStatus = 2;
      await this.gameModel.updateOne({ _id: currentGame._id }, currentGame);

      // set automatically finish flag
      const gameInfo = await this.gameInfoModel.findOne();
      if( gameInfo) {
        gameInfo.isManualFinish = true;
        // gameInfo.lastSlot = currentGame.lastSlot;
        // gameInfo.round += 1;
        await this.gameInfoModel.updateOne({ _id: gameInfo._id }, gameInfo);
      }
    }
    return JSON.stringify({ message: 'Round is finished' });
  }

  async getWinner() {
    const finishGame = await this.gameModel.findOne({ gameStatus: 2 });
    return finishGame.winnerList;
  }

  selectWinner(game: any) {

    const range = game.userList.length;

    if( !range) return;
    if( range === 1) {
      game.winnerList.push(game.userList[0]);
      game.prizeList.push((game.totalAmount / 2  ).toString());
      return;
    }
    if( range === 2) {
      game.winnerList.push(game.userList[0] > game.userList[1] ? game.userList[0] : game.userList[1])
      game.winnerList.push(game.userList[0] > game.userList[1] ? game.userList[1] : game.userList[0])

      game.prizeList.push(((game.totalAmount / 2 / 100) * 65).toString());
      game.prizeList.push(((game.totalAmount / 2 / 100) * 35).toString());
      return;
    }
    if( range >= 3) {
      const selectedIndices = new Set<number>();

      while (selectedIndices.size < 3 && selectedIndices.size < range) {
          const randomIndex = Math.floor(Math.random() * range);
          selectedIndices.add(randomIndex);
      }

      // Add winners to the winnerList
      selectedIndices.forEach(index => {
          game.winnerList.push(game.userList[index]);
      });
    }

    game.prizeList.push(((game.totalAmount / 2 / 100) * 60).toString());
    game.prizeList.push(((game.totalAmount / 2 / 100) * 30).toString());
    game.prizeList.push(((game.totalAmount / 2 / 100) * 10).toString());
  }

  async getCurrentGame(): Promise<string> {
    const finishGame = await this.gameModel.findOne({ gameStatus: 2 });
    if (finishGame) return JSON.stringify(finishGame);

    const currentGame = await this.gameModel.findOne({ gameStatus: 1 });

    return JSON.stringify(currentGame);
  }

  async getRoundCount(): Promise<number> {
    const finishGame = await this.gameModel.find().countDocuments();
    
    return finishGame;
  }

  async getGameHistory(id: string): Promise<GameHistoryDto> {
    const history = await this.gameModel.findOne({ no: parseInt(id) });

    return {
      no: history.no,
      gameStatus: history.gameStatus,
      userList: history.userList,
      txList: history.txList,
      amountList: history.amountList,
      timeList: history.timeList,
      winnerList: history.winnerList,
      prizeList: history.prizeList,
    };
  }

  async sendPrizeToWinners(game: any) {
    console.log("== Sending prize to winners... ==");
   
    const secretKey = bs58.decode(process.env.PRIVATE_KEY);

    const walletKeypair = Keypair.fromSecretKey(secretKey);
    
    const connection = new Connection(RPC_URL, 'confirmed');

    const provider = new AnchorProvider(
        connection,
        new Wallet(walletKeypair),
        { preflightCommitment: "processed", }
    );

    const program = new Program(bettingIDL, PROGRAM_ID, provider);
    const bettingPlatform = await this.getBettingVaultSeed(
      mintPublicKey,
      program.programId
    );
    const bettingState = await this.getBettingStateSeed(program.programId);

    const tx = new Transaction();

    // send half token for burning
    const myTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        walletKeypair.publicKey
      );
    const transInst = await program.methods
      .transfer(new BN(game.totalAmount / 2))
      .accounts({
        owner: walletKeypair.publicKey,
        bettingState: bettingState,
        vaultTokenAccount: bettingPlatform,
        destinationTokenAccount: myTokenAccount,
        destination: walletKeypair.publicKey,
        mint: mintPublicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();
    tx.add(transInst);

    // add three instructions for tranfer
    let index = 0;
    for (const winner of game?.winnerList) {
      const destination = new PublicKey(winner);
      const destinationTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        destination
      );

      console.log(game?.prizeList[index]);
      const transInst = await program.methods
        .transfer(new BN(game?.prizeList[index++]))
        .accounts({
          owner: walletKeypair.publicKey,
          bettingState: bettingState,
          vaultTokenAccount: bettingPlatform,
          destinationTokenAccount: destinationTokenAccount,
          destination: destination,
          mint: mintPublicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();
      tx.add(transInst);
    }

    const signature = await connection.sendTransaction(tx, [
      walletKeypair,
    ]);

    const confirmation = await connection.confirmTransaction(
      signature,
      "confirmed"
    );

    if (!confirmation.value.err) {
      // burn token in admin wallet.
      const userTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        walletKeypair.publicKey
      );

      const transaction = new Transaction().add(
        createBurnInstruction(
          userTokenAccount,
          mintPublicKey,
          walletKeypair.publicKey,
          new BN(game?.totalAmount / 2).toNumber(),
        )
      );

      const signature = await connection.sendTransaction(transaction, [
        walletKeypair,
      ]);
      console.log("Token burnt.");
    }
  };

  async getBettingVaultSeed(
    tokenMint: PublicKey,
    programId: PublicKey
  ) {
    const seedString = "vault";
    const [PDA, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from(seedString), tokenMint.toBuffer()],
      programId
    );
    return new PublicKey(PDA);
  }

  async getBettingStateSeed(programId: PublicKey) {
    const seedString = "betting_state";
    const [PDA, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from(seedString)],
      programId
    );
    return new PublicKey(PDA);
  }

  async updateGameInfo() {
    while (true) {
      const finishGame = await this.gameModel.findOne({ gameStatus: 2 });
      const gameInfo = await this.gameInfoModel.findOne();
      
      if( finishGame) {
        // There's finished game, check manual finish
        if( !gameInfo.isManualFinish) {

          // 
          if( !finishGame.prizeSend) {
            await this.sendPrizeToWinners(finishGame);
            finishGame.prizeSend  = true;
            await this.gameModel.updateOne({ _id: finishGame._id }, finishGame);
          }
          else {
            // start new game automatically.
            console.log("== Starting new round ==");
            await this.startNewGame( gameInfo.minToken , gameInfo.duration.toString());
          }
        }
      }


      this.busy = true;
      const currentGame = await this.gameModel.findOne({ gameStatus: 1 });
      if (!currentGame) {
        await delay(3000);
        this.busy = false;
        continue;
      }
      const { newUsers, currentSlotNumber } = await getNewUserOfGame(
        currentGame.lastSlot,
        currentGame.startTime,
      );
      console.log('New Users :', newUsers?.length);

      if (currentSlotNumber) currentGame.lastSlot = currentSlotNumber;

      if (newUsers && currentGame) {
        // adding new participants

        for (const newUser of newUsers) {
          console.log('userlist : ', currentGame.userList);
          const index = currentGame.userList.findIndex(
            (user) => user === newUser.address,
          );

          if (index === -1) {
            currentGame.userList.push(newUser.address);
            currentGame.amountList.push(newUser.amount);
            currentGame.txList.push(newUser.tx);
            currentGame.timeList.push(newUser.timestamp);
          } else {
            currentGame.amountList[index] += newUser.amount;
            currentGame.txList[index] = newUser.tx;
            currentGame.timeList[index] = newUser.timestamp;
          }
          currentGame.totalAmount += newUser.amount;
        }

        await this.gameModel.updateOne({ _id: currentGame._id }, currentGame);
      }

      // Check game finish
      const currentTime = new Date();
      let stTime = new Date(currentGame.startTime);

      if (
        currentTime.getTime() - stTime.getTime() >
        // currentGame.gameDuration * 24 * 60 * 60 * 1000
        currentGame.gameDuration * 60 * 1000
      ) {
        console.log('selecting winners');

        this.selectWinner(currentGame);
        currentGame.gameStatus = 2;
        await this.gameModel.updateOne({ _id: currentGame._id }, currentGame);

        // set automatically finish flag
        const gameInfo = await this.gameInfoModel.findOne();
        if( gameInfo) {
          gameInfo.isManualFinish = false;
          // gameInfo.lastSlot = currentGame.lastSlot;
          // gameInfo.round += 1;
          await this.gameInfoModel.updateOne({ _id: gameInfo._id }, gameInfo);
        }
      }
      this.busy = false;
      await delay(3000);
    }
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
