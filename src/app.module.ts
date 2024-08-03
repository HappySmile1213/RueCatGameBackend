import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { MongooseModule } from '@nestjs/mongoose';

import { GameSchema} from 'schema/game.schema';
import { GameInfoSchema } from 'schema/gameinfo.schema';

@Module({
  imports: [
    MongooseModule.forRoot("mongodb://127.0.0.1:27017/solana_betting"),
    MongooseModule.forFeature([{ name: 'game', schema: GameSchema }]),
    MongooseModule.forFeature([{ name: 'gameInfo', schema: GameInfoSchema }]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
