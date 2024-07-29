// src/dto/game-history.dto.ts
import { IsArray, IsString } from 'class-validator';

export class GameHistoryDto {
  @IsArray()
  @IsString({ each: true })
  no: number;

  @IsArray()
  @IsString({ each: true })
  gameStatus: number;

  @IsArray()
  @IsString({ each: true })
  userList: string[];

  @IsArray()
  @IsString({ each: true })
  txList: string[];

  @IsArray()
  @IsString({ each: true })
  amountList: string[];

  @IsArray()
  @IsString({ each: true })
  timeList: Date[];

  @IsArray()
  @IsString({ each: true })
  winnerList: string[];

  @IsArray()
  @IsString({ each: true })
  prizeList: string[];
}