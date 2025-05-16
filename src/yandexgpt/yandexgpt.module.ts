import { Module } from '@nestjs/common';
import { YandexGPTService } from './yandexgpt.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [YandexGPTService],
  exports: [YandexGPTService]
})
export class YandexGPTModule {}
