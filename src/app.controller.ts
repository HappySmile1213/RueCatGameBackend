import { Controller, Get, Post, Res, Body, Param, Put } from '@nestjs/common';
import { AppService } from './app.service';
import { GameHistoryDto } from 'dto/gamehistory.dto';

@Controller('bet')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/getWinner/:id')
  getWinner(@Param('id') id: string): Promise<string[]> {
    const rangeNumber = parseInt(id, 10);
    console.log(id);
    return this.appService.getWinner();
  }

  @Get('/getCurrentGame')
  async getCurrentGame(): Promise<string> {
    return await this.appService.getCurrentGame();
  }

  @Get('/getRoundCount')
  async getRoundCount(): Promise<number> {
    return await this.appService.getRoundCount();
  }
  
  @Get('/getGameHistory/:id')
  async getGameHistory(@Param('id') id: string): Promise<GameHistoryDto> {
    return await this.appService.getGameHistory(id);
  }

  @Post('/startNewGame')
  async startNewGame(
    @Body() body: { address: string; minTokens: string; duration: string },
  ): Promise<string> {
    const { address, minTokens, duration } = body;
    return await this.appService.startNewGame(minTokens, duration);
    // return await this.appService.getCurrentGame();
  }

  @Post('/transferToken')
  async transferToken(@Body() body: { address: string }): Promise<string> {
    const { address } = body;
    return await this.appService.transferToken();
  }

  @Post('/finishCurrentGame')
  async finishCurrentGame(@Body() body: { address: string }): Promise<string> {
    const { address } = body;
    return await this.appService.finishCurrentGame(address);
  }
}
