import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { MongooseModule } from '@nestjs/mongoose';

import { GameSchema} from 'schema/game.schema';

@Module({
  imports: [
    MongooseModule.forRoot("mongodb://127.0.0.1:27017/solana_betting"),
    MongooseModule.forFeature([{ name: 'game', schema: GameSchema }]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
