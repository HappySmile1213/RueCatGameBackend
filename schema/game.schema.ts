import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Game {

  @Prop()
  no: number;

  @Prop()
  userList: string[];

  @Prop()
  txList: string[];

  @Prop()
  amountList: string[];

  @Prop()
  winnerList: string[];

  @Prop()
  prizeList: string[];

  @Prop()
  timeList: Date[];

  @Prop()
  winnerHash: string;

  @Prop()
  totalAmount: number;

  @Prop({ type: Date })
  startTime: Date;

  @Prop()
  gameDuration: number;

  @Prop()
  minTokenAmount: number;

  @Prop()
  gameStatus: number;

  @Prop()
  prizeSend: boolean;

  @Prop()
  lastSlot: number;
}

export type GameDocument = Game & Document;
export const GameSchema = SchemaFactory.createForClass(Game);
