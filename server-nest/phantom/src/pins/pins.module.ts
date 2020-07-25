import { Module } from '@nestjs/common';
import { PinsController } from './pins.controller';
import { PinsService } from './pins.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Pin } from '../models/pin.schema';
import { BoardModule } from '../board/board.module';
import { ImagesModule } from '../images/images.module';
import { Board } from 'src/models/board.schema';
import { SharedModule } from 'src/shared/shared.module';
import { Topic } from 'src/models/topic.schema';
@Module({
  imports: [
    SharedModule,
    ImagesModule,
    BoardModule,
    MongooseModule.forFeature([
      { name: 'Pin', schema: Pin },
      { name: 'Board', schema: Board },
      { name: 'Topic', schema: Topic },
    ]),
  ],
  controllers: [PinsController],
  providers: [PinsService],
  exports: [PinsService],
})
export class PinsModule {}