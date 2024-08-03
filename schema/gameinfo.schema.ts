import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class GameInfo {
  @Prop()
  round: number;

  @Prop()
  minToken: string;

  @Prop()
  duration: number;

  @Prop()
  isManualFinish: boolean;

  @Prop()
  lastSlot: number;
}

export type GameInfoDocument = GameInfo & Document;
export const GameInfoSchema = SchemaFactory.createForClass(GameInfo);
