import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';
import { GameDocument, Game, GameSchema } from 'schema/game.schema';
import { GAME_INTERVAL, TOKEN_AMOUNT } from './constants';
import { getNewUserOfGame } from './solana';
import { exit } from 'process';
import { GameHistoryDto } from 'dto/gamehistory.dto';

@Injectable()
export class AppService {
  private slotNumber = 0;
  private lastTime = 0;
  private busy = false;

  constructor(@InjectModel('game') private gameModel: Model<GameDocument>) {
    this.lastTime = new Date().getMilliseconds();
  }

  onModuleInit() {
    this.updateGameInfo();
  }

  getHello(): string {
    return 'Hello World! ABC';
  }

  async transferToken() {
    const finishCurrentGame = await this.gameModel.findOne({ gameStatus: 2 });
    finishCurrentGame.prizeSend = true;

    await this.gameModel.updateOne(
      { _id: finishCurrentGame._id },
      finishCurrentGame,
    );

    return JSON.stringify({ message: 'Token transfer success' });
  }

  async startNewGame(minToken: string, duration: string) {
    // First, change GameStatus as fully finished
    const finishCurrentGame = await this.gameModel.findOne({ gameStatus: 2 });
    if (finishCurrentGame) {
      finishCurrentGame.gameStatus = 3;
      await this.gameModel.updateOne(
        { _id: finishCurrentGame._id },
        finishCurrentGame,
      );
    }

    const currentGame = await this.gameModel.findOne({ gameStatus: 1 });
    if (currentGame) {
      return JSON.stringify({ message: 'Previous round is not finished yet.' });
    }

    const newGame = new this.gameModel({
      no: 1,
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
      minTokenAmount: parseInt(minToken) * 10 ** 6,
      gameStatus: 1,
      lastSlot: 0,
      prizeSend: false,
    });
    console.log('saving');
    await newGame.save();
    return JSON.stringify({ message: 'New round is started' });
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
    }
    return JSON.stringify({ message: 'Round is finished' });
  }

  async getWinner() {
    const finishGame = await this.gameModel.findOne({ gameStatus: 2 });
    return finishGame.winnerList;
  }

  selectWinner(game: any) {
    const range = game.userList.length;
    const first = Math.floor(Math.random() * range);
    const second = Math.floor(Math.random() * range);
    const third = Math.floor(Math.random() * range);

    game.winnerList.push(game.userList[first]);
    game.winnerList.push(game.userList[second]);
    game.winnerList.push(game.userList[third]);

    game.prizeList.push(((game.totalAmount / 100) * 60).toString());
    game.prizeList.push(((game.totalAmount / 100) * 30).toString());
    game.prizeList.push(((game.totalAmount / 100) * 10).toString());
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

  async updateGameInfo() {
    while (true) {
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

      // let endTime = new Date(
      //   stTime.getTime() + gameData.gameDuration * 24 * 60 * 60 * 1000,
      // );

      const currentTime = new Date();
      let stTime = new Date(currentGame.startTime);

      if (
        currentTime.getTime() - stTime.getTime() >
        currentGame.gameDuration * 24 * 60 * 60 * 1000
      ) {
        console.log('selecting winners');

        this.selectWinner(currentGame);
        currentGame.gameStatus = 2;
        await this.gameModel.updateOne({ _id: currentGame._id }, currentGame);
      }
      this.busy = false;
      await delay(3000);
    }
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
