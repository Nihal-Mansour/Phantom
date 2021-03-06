import {
  Controller,
  Post,
  Body,
  Put,
  Delete,
  ForbiddenException,
  BadRequestException,
  Param,
  Get,
  NotFoundException,
  UseGuards,
  Request,
  Query,
  UseFilters,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TopicService } from './topic.service';
import { HttpExceptionFilter } from '../shared/http-exception.filter';
@UseFilters(HttpExceptionFilter)
@Controller()
export class TopicController {
  constructor(private TopicService: TopicService) {}
  //get all the topics
  @UseGuards(AuthGuard('jwt'))
  @Get('/topic')
  async getTopics(@Request() req) {
    let userId = req.user._id;
    let topics = await this.TopicService.getTopics(userId);
    if (topics) return topics;
    return new NotFoundException();
  }
  //get a certain topic
  @UseGuards(AuthGuard('jwt'))
  @Get('/topic/:topicId')
  async getTopic(@Request() req, @Param('topicId') topicId: string) {
    let topic = await this.TopicService.getTopicById(topicId);
    if (topic) return topic;
    return new NotFoundException();
  }
  //get all pins of a certain topic
  @UseGuards(AuthGuard('jwt'))
  @Get('/topic/:topicId/pins')
  async getPinsOfAtopic(
    @Request() req,
    @Param('topicId') topicId: string,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ) {
    let pins = await this.TopicService.getPinsOfTopic(topicId, limit, offset);
    if (pins && pins.length != 0) return pins;
    return new NotFoundException();
  }
  //add pin to a certain topic
  @UseGuards(AuthGuard('jwt'))
  @Post('/topic/addPin')
  async addPinToAtopic(
    @Body('pinId') pinId: string,
    @Body('topicName') topicName: string,
  ) {
    let topics = await this.TopicService.addPinToTopic(topicName, pinId);
    if (topics) return { message: 'pin has been added successfully!' };
    return new ForbiddenException();
  }
  @UseGuards(AuthGuard('jwt'))
  @Post('/createTopic')
  async createTopic(
    @Body('imageId') imageId: string,
    @Body('imageHeight') imageHeight: number,
    @Body('imageWidth') imageWidth: number,
    @Body('name') name: string,
    @Body('description') description: string,
  ) {
    let topic = await this.TopicService.createTopic(
      imageId,
      description,
      imageWidth,
      imageHeight,
      name,
    );
    if (topic) return topic;
    return new ForbiddenException();
  }

  @Post('/createTopics')
  async createTopics(
    @Body('topics') topics: Array<object>,
    @Body('topics') images: Array<object>,
  ) {
    let topic = await this.TopicService.topicsSeeds(topics);
    if (topic) return topic;
    return new ForbiddenException();
  }
  @Put('/edit')
  async addImageToTopic(@Body('topics') topics: Array<object>) {
    let topic = await this.TopicService.editTopic(topics);
    if (topic) return topic;
    return new ForbiddenException();
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/me/follow-topic/:topicId')
  async followTopic(@Param() params, @Request() req) {
    if (!(await this.TopicService.followTopic(req.user._id, params.topicId)))
      throw new BadRequestException('can not follow this topic');
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('/me/follow-topic/:topicId')
  async unfollowTopic(@Param() params, @Request() req) {
    if (!(await this.TopicService.unfollowTopic(req.user._id, params.topicId)))
      throw new BadRequestException('can not unfollow this topic');
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/me/follow-topic/:topicId')
  async checkFollowTopic(@Param() params, @Request() req) {
    if (
      !(await this.TopicService.checkFollowTopic(req.user._id, params.topicId))
    )
      return { follow: 'false' };
    return { follow: 'true' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/me/following-topics')
  async followingTopics(@Request() req) {
    return await this.TopicService.followingTopics(req.user._id);
  }
}
