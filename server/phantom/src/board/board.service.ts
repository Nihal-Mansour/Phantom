import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { Model, Mongoose } from 'mongoose';
import * as mongoose from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { board } from '../types/board';
import { UserService } from '../user/user.service';
import { pin } from '../types/pin';
import { ValidationService } from '../shared/validation.service';
import { section } from '../types/board';
import { topic } from '../types/topic';
import { EditBoardDto } from './dto/edit-board.dto';
import { EditCollaboratoresPermissionsDto } from './dto/edit-collaboratores-permissions.dto';
import { user } from '../types/user';
@Injectable()
export class BoardService {
  constructor(
    @InjectModel('Board') private readonly boardModel: Model<board>,
    @InjectModel('Pin') private readonly pinModel: Model<pin>,
    @InjectModel('Topic') private readonly topicModel: Model<topic>,
    @InjectModel('User') private readonly userModel: Model<user>,
    private ValidationService: ValidationService,
  ) {}
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description get board document
   * @param {string} boardId - the id of the board
   * @returns  {Promise<board>}
   */
  async getBoardById(boardId): Promise<board> {
    try {
      if (!this.ValidationService.checkMongooseID([boardId]))
        throw new Error('not mongoose id');
      const board = await this.boardModel.findById(boardId);
      return board;
    } catch (ex) {
      throw new Error('not found');
    }
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description add created or saved pin to board
   * @param {string} pinId - the id of the pin
   * @param {string} boardId - the id of the board
   * @param {string} sectionId - the id of the section
   * @returns  {Promise<boolean>}
   */
  async addPintoBoard(pinId, boardId, sectionId) {
    if ((await this.ValidationService.checkMongooseID([pinId, boardId])) == 0) {
      throw new BadRequestException('not valid id');
    }
    if (sectionId) {
      if ((await this.ValidationService.checkMongooseID([sectionId])) == 0) {
        throw new BadRequestException('not valid section id');
      }
    } else {
      sectionId = null;
    }

    let board = await this.boardModel.findById(boardId, {
      sections: 1,
      pins: 1,
      counts: 1,
    });
    if (!board) throw new NotFoundException();
    let pin = await this.pinModel.findById(pinId, {
      topic: 1,
      imageId: 1,
    });

    if (!pin) throw new NotFoundException();

    if (sectionId) {
      for (let i = 0; i < board.sections.length; i++) {
        if (String(board.sections[i]._id) == String(sectionId)) {
          board.sections[i].pins.push({ pinId: pin._id, topic: pin.topic });

          break;
        }
      }
    } else {
      board.pins.push({
        pinId: pin._id,
        topic: pin.topic,
      });
      board.counts.pins = board.counts.pins.valueOf() + 1;
    }
    await board.save().catch(err => {
      console.log(err);
    });
    return true;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description create new board
   * @param {string} name - the name of the created board
   * @param {string} startDate - the startDate of the created board
   * @param {string} endDate - the endDate of the created board
   * @param {string} userId - the id of the user
   * @returns  {Promise<object>}
   */
  async createBoard(name: string, startDate: string, endDate: string, userId) {
    userId = mongoose.Types.ObjectId(userId);
    let user = await this.userModel.findById(
      userId,

      {
        firstName: 1,
        lastName: 1,
      },
    );
    if (!user) throw new NotFoundException('no such user');
    let sd = startDate ? startDate : null;
    let ed = endDate ? endDate : null;

    let board = new this.boardModel({
      name: name,
      pins: [],
      status: 'public',
      startDate: sd,
      endDate: ed,
      createdAt: Date.now(),
      description: '',
      personalization: false,
      collaborators: [],
      sections: [],
      isJoined: false,
      followers: [],
      counts: {
        followers: 0,
        joiners: 0,
        pins: 0,
      },
      coverImages: [],
      creator: {
        firstName: user.firstName,
        lastName: user.lastName,
        id: userId,
      },
    });
    await board.save().catch(err => {
      console.log(err);
    });
    await this.addBoardtoUser(userId, board._id);
    let topics = await this.topicModel.find(
      {},
      {
        name: 1,
        recommendedUsers: 1,
      },
    );
    for (let i = 0; i < topics.length; i++) {
      if (
        board.name.includes(String(topics[i].name)) ||
        board.description.includes(String(topics[i].name))
      ) {
        if (!topics[i].recommendedUsers) topics[i].recommendedUsers = [];
        if (!topics[i].recommendedUsers.includes(user._id)) {
          topics[i].recommendedUsers.push(user._id);
          await topics[i].save();
          break;
        }
      }
    }
    await this.boardModel.ensureIndexes();
    return { _id: board._id };
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description sort user boards alphabetacilly
   * @param {string} userId - the id of the user
   * @returns  {Promise<boolean>}
   */
  async sortBoardsAtoZ(userId) {
    userId = mongoose.Types.ObjectId(userId);
    let user = await this.userModel.findById(
      userId,

      {
        boards: 1,
        sortType: 1,
      },
    );

    await user.boards.sort((a, b) => a.name.localeCompare(b.name.toString()));
    user.sortType = 'A-Z';
    await user.save();
    return true;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description sort user boards by date
   * @param {string} userId - the id of the user
   * @returns  {Promise<boolean>}
   */
  async sortBoardsDate(userId) {
    userId = mongoose.Types.ObjectId(userId);
    let user = await this.userModel.findById(
      userId,

      {
        boards: 1,
        sortType: 1,
      },
    );
    await user.boards.sort(function(a, b) {
      if (a.createdAt > b.createdAt) {
        return -1;
      }
      if (a.createdAt < b.createdAt) {
        return 1;
      }
      return 0;
    });
    user.sortType = 'Date';
    await user.save();
    return true;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description reorder user boards
   * @param {string} userId - the id of the user
   * @param {number} startIndex - the index of the element needed to be reordered
   * @param {number} positionIndex - the index of the new element position in the array
   * @returns  {Promise<boolean>}
   */
  async reorderBoards(userId, startIndex, positionIndex) {
    userId = mongoose.Types.ObjectId(userId);
    let user = await this.userModel.findById(
      userId,

      {
        boards: 1,
        sortType: 1,
      },
    );
    if (
      startIndex < 0 ||
      startIndex >= user.boards.length ||
      positionIndex < 1 ||
      positionIndex > user.boards.length
    ) {
      throw new BadRequestException({
        message: 'startIndex or positionIndex are not valid',
      });
    }
    let desiredBorder = await user.boards.splice(startIndex, 1);
    await user.boards.splice(positionIndex - 1, 0, desiredBorder[0]);
    user.sortType = 'Reorder';
    await user.save();
    return true;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description add board to user
   * @param {string} userId - the id of the user
   * @param {string} boardId - the id of the board
   * @returns  {Promise<boolean>}
   */
  async addBoardtoUser(userId, boardId) {
    if (
      (await this.ValidationService.checkMongooseID([userId, boardId])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }
    boardId = mongoose.Types.ObjectId(boardId);
    userId = mongoose.Types.ObjectId(userId);
    let board = await this.boardModel.findById(boardId, {
      name: 1,
      createdAt: 1,
    });
    let user = await this.userModel.findById(userId, {
      boards: 1,
      sortType: 1,
    });
    if (!board) throw new NotFoundException();
    if (!user) throw new NotFoundException();
    let id = mongoose.Types.ObjectId(boardId);
    user.boards.push({
      boardId: id,
      name: board.name,
      createdAt: board.createdAt,
      isJoined: false,
      createdOrjoined: 'created',
    });
    await user.save().catch(err => {
      console.log(err);
    });
    return true;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description get current user boards
   * @param {string} userId - the id of the user
   * @returns  {Promise<Array<object>>}
   */
  async getCurrentUserBoards(userId) {
    if ((await this.ValidationService.checkMongooseID([userId])) == 0) {
      throw new BadRequestException("not valid id")
    }
    userId = mongoose.Types.ObjectId(userId);
    let user = await this.userModel.findById(userId, {
      boards: 1,
    });
    if (!user) throw new NotFoundException()

    let retBoards = [];
    let permissions = {};
    for (let i = 0; i < user.boards.length; i++) {
      let board = await this.boardModel.findById(user.boards[i].boardId, {
        coverImages: 1,
        collaborators: 1,
        counts: 1,
        name: 1,
        pins: 1,
        sections: 1,
      });
      board.coverImages = [];
      for (let c = 0; c < 3; c++) {
        if (c < board.pins.length) {
          let coverPin = await this.pinModel.findById(board.pins[c].pinId, {
            imageId: 1,
          });
          board.coverImages.push(coverPin.imageId);
        }
      }
      let createdOrjoined = 'created';
      if (user.boards[i].createdOrjoined == 'joined') {
        createdOrjoined = 'joined';
        for (let j = 0; j < board.collaborators.length; j++) {
          if (String(board.collaborators[j].collaboratorId) == String(userId)) {
            permissions = {
              savePin: board.collaborators[j].savePin,
              createPin: board.collaborators[j].createPin,
              addCollaborators: board.collaborators[j].addCollaborators,
              editDescription: board.collaborators[j].editDescription,
              editTitle: board.collaborators[j].editTitle,
              personalization: board.collaborators[j].personalization,
            };
            break;
          }
        }
      }
      if (board) {
        retBoards.push({
          board: board,
          createdOrjoined: createdOrjoined,
          permissions: permissions,
        });
      }
    }
    return retBoards;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description get user authorized boards
   * @param {string} userId - the id of the current user
   * @param {string} boardUserId - the id of the boards user
   * @returns  {Promise<Array<object>>}
   */
  async getSomeUserBoards(userId, boardUserId) {
    if (
      (await this.ValidationService.checkMongooseID([userId, boardUserId])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }
    userId = mongoose.Types.ObjectId(userId);
    boardUserId = mongoose.Types.ObjectId(boardUserId);

    let boardUser = await this.userModel.findById(boardUserId, {
      boards: 1,
      email: 1,
    });
    if (!boardUser) throw new NotFoundException();
    if (boardUser.email == process.env.ADMIN_EMAIL) {
      throw new UnauthorizedException();
    }
    let retBoards = [];
    for (var i = 0; i < boardUser.boards.length; i++) {
      let board = await this.boardModel.findById(boardUser.boards[i].boardId, {
        coverImages: 1,
        collaborators: 1,
        counts: 1,
        creator: 1,
        name: 1,
        pins: 1,
        sections: 1,
      });
      if (!board) continue;
      board.coverImages = [];
      for (let c = 0; c < 3; c++) {
        if (c < board.pins.length) {
          let coverPin = await this.pinModel.findById(board.pins[c].pinId, {
            imageId: 1,
          });
          board.coverImages.push(coverPin.imageId);
        }
      }
      let collaborator = await this.isCollaborator(board, userId);
      let isJoined = false;
      let permissions = {};
      if (collaborator) {
        isJoined = true;
        permissions = {
          savePin: collaborator.savePin,
          createPin: collaborator.createPin,
          addCollaborators: collaborator.addCollaborators,
          editDescription: collaborator.editDescription,
          editTitle: collaborator.editTitle,
          personalization: collaborator.personalization,
        };
      }

      retBoards.push({
        board: board,
        isJoined: isJoined,
        permissions: permissions,
      });
    }
    return retBoards;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description check if user is authorized to edit this board
   * @param {board} board
   * @param {string} userId - the id of the user
   * @returns  {Promise<boolean>}
   */
  async authorizedBoard(board, userId) {
    if (!board) return false;
    if (String(board.creator.id) == String(userId)) return true;
    if (!board.collaborators) {
      board.collaborators = [];
      await board.save();
    }
    for (let i = 0; i < board.collaborators.length; i++) {
      if (String(board.collaborators[i].collaboratorId) == String(userId)) {
        return true;
      }
    }
    return false;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description check if a board is public
   * @param {string} boardId - the id of the board
   * @returns  {Promise<boolean>}
   */
  async isPublicBoard(boardId) {
    let board = await this.boardModel.findById(boardId,{status:1});
    if (!board) return false;
    if (!board.status || board.status == '' || board.status == 'public')
      return true;
    return false;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description check if a user is the creator of a board
   * @param {board} board
   * @param {string} userId - the id of the user
   * @returns  {Promise<boolean>}
   */
  async isCreator(board, userId) {
    if (!board) return false;
    if (String(board.creator.id) == String(userId)) return true;
    return false;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description check if a user is a collaborator of a board
   * @param {board} board
   * @param {string} userId - the id of the user
   * @returns  {Promise<boolean>}
   */
  async isCollaborator(board, userId) {
    if (!board) return false;
    if (!board.collaborators) {
      board.collaborators = [];
      await board.save();
    }
    for (let i = 0; i < board.collaborators.length; i++) {
      if (String(board.collaborators[i].collaboratorId) == String(userId)) {
        return board.collaborators[i];
      }
    }
    return false;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description Edit board by creator or collaborator
   * @param {string} boardId - the id of the board
   * @param {string} userId - the id of the user
   * @param {EditBoardDto} editBoardDto - the board new data object
   * @returns  {Promise<board>}
   */
  async editBoard(boardId, userId, editBoardDto: EditBoardDto) {
    if (
      (await this.ValidationService.checkMongooseID([boardId, userId])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }
    userId = mongoose.Types.ObjectId(userId);
    boardId = mongoose.Types.ObjectId(boardId);
    let board = await this.boardModel.findById(boardId, {
      name: 1,
      status: 1,
      startDate: 1,
      endDate: 1,
      createdAt: 1,
      description: 1,
      topic: 1,
      personalization: 1,
      collaborators: 1,
      creator: 1,
    });
    if (!board) {
      throw new BadRequestException('not valid board');
    }
    let creator = await this.userModel.findById(
      board.creator.id,

      {
        boards: 1,
      },
    );
    if (!creator) {
      throw new BadRequestException('no board creator found');
    }
    if (!(await this.authorizedBoard(board, userId))) {
      throw new UnauthorizedException(
        'this user is unauthorized to edit this board',
      );
    }
    let isCreator = await this.isCreator(board, userId);
    let isCollaborator = await this.isCollaborator(board, userId);
    if (
      (isCreator || (isCollaborator && isCollaborator.editTitle)) &&
      editBoardDto.name
    ) {
      board.name = editBoardDto.name;

      for (var i = 0; i < creator.boards.length; i++) {
        if (String(boardId) == String(creator.boards[i].boardId)) {
          creator.boards[i].name = editBoardDto.name;
          await creator.save();
          break;
        }
      }
    }
    if (isCreator && editBoardDto.endDate) {
      board.endDate = editBoardDto.endDate;
    }
    if (isCreator && editBoardDto.startDate) {
      board.startDate = editBoardDto.startDate;
    }
    if (
      (isCreator || (isCollaborator && isCollaborator.editDescription)) &&
      editBoardDto.description
    ) {
      board.description = editBoardDto.description;
    }
    if (
      (isCreator || (isCollaborator && isCollaborator.personalization)) &&
      editBoardDto.personalization
    ) {
      board.personalization = editBoardDto.personalization;
    }

    if (editBoardDto.topic) {
      board.topic = editBoardDto.topic;
      let topic = await this.topicModel.findOne(
        { name: editBoardDto.topic },
        {
          recommendedUsers: 1,
        },
      );
      if (!topic.recommendedUsers) topic.recommendedUsers = [];
      if (!topic.recommendedUsers.includes(creator._id)) {
        topic.recommendedUsers.push(userId);
        await topic.save();
      }
    }
    if (
      (isCreator || (isCollaborator && isCollaborator.addCollaborators)) &&
      editBoardDto.collaboratores
    ) {
      let collaboratores = await editBoardDto.collaboratores.split(',');
      for (var i = 0; i < collaboratores.length; i++) {
        if (
          (await this.ValidationService.checkMongooseID([collaboratores[i]])) ==
          0
        ) {
          continue;
        }
        let id = mongoose.Types.ObjectId(collaboratores[i]);
        let collaborator = await this.userModel.findById(
          id,

          { boards: 1 },
        );
        if (!collaborator) continue;
        if (!board.collaborators) board.collaborators = [];
        board.collaborators.push({
          collaboratorId: id,
          savePin: true,
          createPin: true,
          personalization: true,
          editTitle: false,
          editDescription: false,
          addCollaborators: false,
        });

        collaborator.boards.push({
          boardId: boardId,
          name: board.name,
          createdAt: board.createdAt,
          isJoined: board.isJoined,
          createdOrjoined: 'joined',
        });
        await collaborator.save();
        await board.save();
      }
    }
    await board.save();
    return board;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description get collaborators of a board
   * @param {string} boardId - the id of the board
   * @param {string} userId - the id of the user
   * @returns  {Promise<Array<object>>}
   */
  async getCollaboratoresPermissions(userId, boardId) {
    if (
      (await this.ValidationService.checkMongooseID([boardId, userId])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }
    boardId = mongoose.Types.ObjectId(boardId);
    userId = mongoose.Types.ObjectId(userId);
    let board = await this.boardModel.findById(boardId, {
      status: 1,
      collaborators: 1,
      creator: 1,
    });
    if (!board) {
      throw new BadRequestException('not valid board');
    }

    let isCreator = await this.isCreator(board, userId);
    let isCollaborator = await this.isCollaborator(board, userId);
    if (!isCreator && !isCollaborator) {
      throw new UnauthorizedException(
        'this user is unauthorized to get this board permissions',
      );
    }
    let retCollaborators = [];
    for (var i = 0; i < board.collaborators.length; i++) {
      let collaborator = await this.userModel.findById(
        board.collaborators[i].collaboratorId,

        {
          firstName: 1,
          lastName: 1,
          profileImage: 1,
          google: 1,
          googleImage: 1,
        },
      );
      retCollaborators.push({
        id: collaborator._id,
        imageId: collaborator.profileImage,
        google: collaborator.google,
        googleImage: collaborator.googleImage,
        name: collaborator.firstName + ' ' + collaborator.lastName,
        savePin: board.collaborators[i].savePin,
        createPin: board.collaborators[i].createPin,
        editTitle: board.collaborators[i].editTitle,
        personalization: board.collaborators[i].personalization,
        editDescription: board.collaborators[i].editDescription,
        addCollaborators: board.collaborators[i].addCollaborators,
      });
    }
    return retCollaborators;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description edit collaborators permission of a board by the board creator
   * @param {string} boardId - the id of the board
   * @param {string} userId - the id of the usersa
   * @param {EditCollaboratoresPermissionsDto} editCollaboratoresPermissionsDto - the new permissions object
   * @returns  {Promise<object>}
   */
  async editCollaboratoresPermissions(
    userId,
    boardId,
    editCollaboratoresPermissionsDto: EditCollaboratoresPermissionsDto,
  ) {
    let collaboratorId = editCollaboratoresPermissionsDto.collaboratorId,
      savePin = editCollaboratoresPermissionsDto.savePin,
      createPin = editCollaboratoresPermissionsDto.createPin,
      addCollaborators = editCollaboratoresPermissionsDto.addCollaborators,
      editTitle = editCollaboratoresPermissionsDto.editTitle,
      personalization = editCollaboratoresPermissionsDto.personalization,
      editDescription = editCollaboratoresPermissionsDto.editDescription;
    if (
      (savePin != true && savePin != false) ||
      (createPin != true && createPin != false) ||
      (addCollaborators != true && addCollaborators != false) ||
      (editTitle != true && editTitle != false) ||
      (personalization != true && personalization != false) ||
      (editDescription != true && editDescription != false)
    ) {
      throw new BadRequestException('permissions must be boolean values');
    }
    if (
      (await this.ValidationService.checkMongooseID([
        boardId,
        userId,
        collaboratorId,
      ])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }

    let board = await this.boardModel.findById(boardId, {
      status: 1,
      collaborators: 1,
      creator: 1,
    });
    if (!board) {
      throw new BadRequestException('not valid board');
    }
    if (String(board.creator.id) != String(userId)) {
      throw new UnauthorizedException(
        'this user is unauthorized to edit this board permissions',
      );
    }
    for (var i = 0; i < board.collaborators.length; i++) {
      if (
        String(board.collaborators[i].collaboratorId) == String(collaboratorId)
      ) {
        board.collaborators[i].savePin = savePin;
        board.collaborators[i].createPin = createPin;
        board.collaborators[i].editTitle = editTitle;
        board.collaborators[i].addCollaborators = addCollaborators;
        board.collaborators[i].personalization = personalization;
        board.collaborators[i].editDescription = editDescription;

        await board.save();
        return {
          id: board.collaborators[i].collaboratorId,
          savePin: board.collaborators[i].savePin,
          createPin: board.collaborators[i].createPin,
          editTitle: board.collaborators[i].editTitle,
          addCollaborators: board.collaborators[i].addCollaborators,
          personalization: board.collaborators[i].personalization,
          editDescription: board.collaborators[i].editDescription,
        };
      }
    }
    throw new Error();
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description delete collaborator from a board by the board creator
   * @param {string} boardId - the id of the board
   * @param {string} userId - the id of the user
   * @param {string} collaboratorId - the id of the collaborator
   * @returns  {Promise<boolean>}
   */
  async deleteCollaborator(userId, boardId, collaboratorId) {
    if (
      (await this.ValidationService.checkMongooseID([
        boardId,
        userId,
        collaboratorId,
      ])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }

    let board = await this.boardModel.findById(boardId, {
      status: 1,
      collaborators: 1,
      creator: 1,
    });
    if (!board) {
      throw new BadRequestException('not valid board');
    }
    if (String(board.creator.id) != String(userId)) {
      throw new UnauthorizedException(
        'this user is unauthorized to get this board permissions',
      );
    }
    let collaborator = null;
    if (board.collaborators.length == 0) {
      throw new NotFoundException('this board has no collaboratores');
    }

    for (let i = 0; i < board.collaborators.length; i++) {
      if (
        String(board.collaborators[i].collaboratorId) == String(collaboratorId)
      ) {
        collaborator = await this.userModel.findById(
          board.collaborators[i].collaboratorId,
          { boards: 1 },
        );
        board.collaborators.splice(i, 1);
        await board.save();
        break;
      }
    }
    if (collaborator) {
      for (let index = 0; index < collaborator.boards.length; index++) {
        if (
          String(collaborator.boards[index].boardId) == String(boardId) &&
          collaborator.boards[index].createdOrjoined == 'joined'
        ) {
          collaborator.boards.splice(index, 1);
          await collaborator.save();
          return true;
        }
      }
    } else {
      throw new NotAcceptableException('collaborator not found');
    }
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description delete pin from a board
   * @param {string} pinId - the id of the pin
   * @param {string} userId - the id of the user
   * @returns  {Promise<boolean>}
   */
  async deletePin(pinId, userId) {
    if ((await this.ValidationService.checkMongooseID([pinId, userId])) == 0) {
      throw new BadRequestException('not valid id');
    }
    let pin = await this.pinModel.findById(pinId, {
      board: 1,
      section: 1,
      topic: 1,
      savers: 1,
      creator: 1,
    });
    if (!pin) {
      throw new BadRequestException('not valid board');
    }

    if (String(pin.creator.id) != String(userId)) {
      throw new UnauthorizedException(
        'this user is unauthorized to delete this pin',
      );
    }
    let creator = await this.userModel.findById(pin.creator.id, {
      pins: 1,
    });
    if (!creator) {
      throw new NotAcceptableException('not valid pin creator');
    }
    for (let i = 0; i < creator.pins.length; i++) {
      if (String(creator.pins[i].pinId) == String(pinId)) {
        let pinBoard = await this.boardModel.findById(creator.pins[i].boardId, {
          sections: 1,
          pins: 1,
        });
        let pinSection = pin.section;
        if (pinSection) {
          for (let j = 0; j < pinBoard.sections.length; j++) {
            if (String(pinBoard.sections[j]._id) == String(pinSection)) {
              for (let k = 0; k < pinBoard.sections[j].pins.length; k++) {
                if (
                  String(pinBoard.sections[j].pins[k].pinId) == String(pinId)
                ) {
                  pinBoard.sections[j].pins.splice(k, 1);
                  await pinBoard.save();
                  break;
                }
              }
            }
          }
        } else {
          for (let j = 0; j < pinBoard.pins.length; j++) {
            if (String(pinBoard.pins[j].pinId) == String(pinId)) {
              pinBoard.pins.splice(j, 1);
              await pinBoard.save();
              break;
            }
          }
        }

        creator.pins.splice(i, 1);
        await creator.save();
        break;
      }
    }
    let savers = [];
    for (let i = 0; i < pin.savers.length; i++) {
      let saverUser = await this.userModel.findById(pin.savers[i], {
        savedPins: 1,
      });
      if (saverUser) {
        savers.push(saverUser);
      }
    }

    for (let k = 0; k < savers.length; k++) {
      for (let i = 0; i < savers[k].savedPins.length; i++) {
        if (String(savers[k].savedPins[i].pinId) == String(pinId)) {
          let pinBoard = await this.boardModel.findById(
            savers[k].savedPins[i].boardId,
            {
              pins: 1,
              sections: 1,
            },
          );
          let pinSection = savers[k].savedPins[i].sectionId;
          if (pinSection) {
            for (let j = 0; j < pinBoard.sections.length; j++) {
              if (String(pinBoard.sections[j]._id) == String(pinSection)) {
                for (let n = 0; n < pinBoard.sections[j].pins.length; n++) {
                  if (
                    String(pinBoard.sections[j].pins[n].pinId) == String(pinId)
                  ) {
                    pinBoard.sections[j].pins.splice(n, 1);
                    await pinBoard.save();
                    break;
                  }
                }
              }
            }
          } else {
            for (let j = 0; j < pinBoard.pins.length; j++) {
              if (String(pinBoard.pins[j].pinId) == String(pinId)) {
                pinBoard.pins.splice(j, 1);
                await pinBoard.save();
                break;
              }
            }
          }
          savers[k].savedPins.splice(i, 1);
          await savers[k].save();
          break;
        }
      }
    }
    let topic = await this.topicModel.findOne({ name: pin.topic }, { pins: 1 });
    if (topic) {
      for (var i = 0; i < topic.pins.length; i++) {
        if (String(topic.pins[i]) == String(pinId)) {
          topic.pins.splice(i, 1);
          await topic.save();
        }
      }
    }
    await this.pinModel.deleteOne({ _id: pinId });
    return true;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description delete pin from a board/section in delete board/section
   * @param {string} pinId - the id of the pin
   * @param {string} userId - the id of the user
   * @param {string} boardId - the id of the board
   * @param {string} sectionId - the id of the section
   * @returns  {Promise<boolean>}
   */
  async deletePinFromBoardSection(pinId, userId, boardId, sectionId) {
    if (
      (await this.ValidationService.checkMongooseID([
        pinId,
        boardId,
        userId,
      ])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }
    let user = await this.userModel.findById(userId, { pins: 1 });
    if (!user) {
      throw new BadRequestException('not valid user');
    }
    let board = await this.boardModel.findById(boardId, {
      collaborators: 1,
      creator: 1,
      status: 1,
    });
    if (!board) {
      throw new BadRequestException('not valid board');
    }
    if (String(board.creator.id) != String(userId)) {
      throw new UnauthorizedException(
        'this user is unauthorized to delete pins from this board ',
      );
    }
    let found = false;
    found = await this.unsavePin(pinId, boardId, sectionId, userId, true);
    if (found) return true;

    for (let i = 0; i < user.pins.length; i++) {
      if (String(user.pins[i].pinId) == String(pinId)) {
        await this.deletePin(pinId, userId);
        found = true;
        break;
      }
    }

    if (!found) {
      for (let i = 0; i < board.collaborators.length; i++) {
        let collaborator = await this.userModel.findById(
          board.collaborators[i].collaboratorId,
          { pins: 1 },
        );
        if (collaborator) {
          for (let j = 0; j < collaborator.pins.length; j++) {
            if (String(collaborator.pins[j].pinId) == String(pinId)) {
              await this.deletePin(
                pinId,
                board.collaborators[i].collaboratorId,
              );
              found = true;
              break;
            }
          }
        }
      }
    }
    return found;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description delete board
   * @param {string} userId - the id of the user
   * @param {string} boardId - the id of the board
   * @returns  {Promise<boolean>}
   */

  async deleteBoard(userId, boardId) {
    if (
      (await this.ValidationService.checkMongooseID([boardId, userId])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }
    let user = await this.userModel.findById(userId, { boards: 1 });
    if (!user) {
      throw new BadRequestException('not valid user');
    }
    let board = await this.boardModel.findById(boardId, {
      pins: 1,
      collaborators: 1,
      sections: 1,
      creator: 1,
      status: 1,
    });
    if (!board) {
      throw new BadRequestException('not valid board');
    }
    if (String(board.creator.id) != String(userId)) {
      throw new UnauthorizedException(
        'this user is unauthorized to delete this board ',
      );
    }
    for (var i = 0; i < user.boards.length; i++) {
      if (String(user.boards[i].boardId) == String(boardId)) {
        user.boards.splice(i, 1);
        await user.save();
        break;
      }
    }
    for (var k = 0; k < board.collaborators.length; k++) {
      let collaborator = await this.userModel.findById(
        board.collaborators[k].collaboratorId,
        {
          boards: 1,
        },
      );
      if (collaborator) {
        for (var i = 0; i < collaborator.boards.length; i++) {
          if (String(collaborator.boards[i].boardId) == String(boardId)) {
            collaborator.boards.splice(i, 1);
            await collaborator.save();
            break;
          }
        }
      }
    }
    for (let i = 0; i < board.pins.length; i++) {
      let isDeleted = await this.deletePinFromBoardSection(
        board.pins[i].pinId,
        userId,
        boardId,
        undefined,
      );
      if (!isDeleted) {
        throw new Error("error while deleting board's pins");
      }
    }
    for (let i = 0; i < board.sections.length; i++) {
      for (let k = 0; k < board.sections[i].pins.length; k++) {
        let isDeleted = await this.deletePinFromBoardSection(
          board.sections[i].pins[k].pinId,
          userId,
          boardId,
          board.sections[i]._id,
        );
        if (!isDeleted) {
          throw new Error("error while deleting board's pins");
        }
      }
    }
    let isBoardDeleted = await board.deleteOne();
    if (isBoardDeleted) return true;
    return false;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description delete board while merging it
   * @param {string} userId - the id of the user
   * @param {string} boardId - the id of the board
   * @returns  {Promise<boolean>}
   */
  async deleteBoardInMerge(userId, boardId) {
    if (
      (await this.ValidationService.checkMongooseID([boardId, userId])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }
    let user = await this.userModel.findById(userId, { boards: 1 });
    if (!user) {
      throw new BadRequestException('not valid user');
    }
    let board = await this.boardModel.findById(boardId, {
      creator: 1,
      collaborators: 1,
      status: 1,
    });
    if (!board) {
      throw new BadRequestException('not valid board');
    }
    if (String(board.creator.id) != String(userId)) {
      throw new UnauthorizedException(
        'this user is unauthorized to delete this board ',
      );
    }
    for (let i = 0; i < user.boards.length; i++) {
      if (String(user.boards[i].boardId) == String(boardId)) {
        user.boards.splice(i, 1);
        await user.save();
        break;
      }
    }
    for (let k = 0; k < board.collaborators.length; k++) {
      let collaborator = await this.userModel.findById(
        board.collaborators[k].collaboratorId,
        { boards: 1 },
      );
      if (collaborator) {
        for (let i = 0; i < collaborator.boards.length; i++) {
          if (String(collaborator.boards[i].boardId) == String(boardId)) {
            collaborator.boards.splice(i, 1);
            await collaborator.save();
            break;
          }
        }
      }
    }

    let isBoardDeleted = await board.deleteOne();
    if (isBoardDeleted) return true;
    return false;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description create new section in a board
   * @param {string} userId - the id of the user
   * @param {string} boardId - the id of the board
   * @param {string} sectionName - the name of the section
   * @returns  {Promise<section>}
   */
  async createSection(boardId, sectionName, userId) {
    if (
      (await this.ValidationService.checkMongooseID([boardId, userId])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }

    let board = await this.boardModel.findById(boardId, {
      status: 1,
      collaborators: 1,
      creator: 1,
      sections: 1,
    });
    if (!board) {
      throw new BadRequestException('not valid board');
    }
    if (!(await this.authorizedBoard(board, userId))) {
      throw new UnauthorizedException(
        'this user is unauthorized to create section in this board',
      );
    }
    if (!sectionName || sectionName == '') {
      throw new BadRequestException('not valid section name');
    }
    if (!board.sections) board.sections = [];
    let section = <section>(<unknown>{
      sectionName: sectionName,
      creatorId: userId,
      pins: [],
      coverImages: [],
    });
    board.sections.push(section);
    await board.save();
    return section;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description check if board has section
   * @param {board} board
   * @param {string} sectionId - the id of the section
   * @returns  {Promise<boolean>}
   */
  async checkBoardHasSection(board, sectionId): Promise<Boolean> {
    if ((await this.ValidationService.checkMongooseID([sectionId])) == 0) {
      throw new BadRequestException('not valid section id');
    }
    for (let i = 0; i < board.sections.length; i++) {
      if (String(board.sections[i]._id) == String(sectionId)) {
        return true;
      }
    }
    return false;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description merge two boards into one board
   * @param {string} userId - the id of the user
   * @param {string} boardOriginalId - the id of the board that will contain the 2 merged boards
   * @param {string} boardMergedId - the id of the board that will be merged then deleted
   * @returns  {Promise<board>}
   */
  async merge(boardOriginalId, boardMergedId, userId) {
    if (
      (await this.ValidationService.checkMongooseID([
        boardOriginalId,
        boardMergedId,
        userId,
      ])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }

    let boardOriginal = await this.boardModel.findById(boardOriginalId, {
      sections: 1,
      creator: 1,
      collaborators: 1,
    });
    let boardMerged = await this.boardModel.findById(boardMergedId, {
      sections: 1,
      pins: 1,
      name: 1,
      creator: 1,
      coverImages: 1,
    });
    if (!boardOriginal || !boardMerged) {
      throw new BadRequestException('not valid boards');
    }

    let isAuthorized = await this.authorizedBoard(boardOriginal, userId);
    if (!(String(userId) == String(boardMerged.creator.id)) || !isAuthorized) {
      throw new UnauthorizedException(
        'user is unauthorized to merge these boards',
      );
    }
    if (!boardOriginal.sections) boardOriginal.sections = [];

    let originalName =
      boardMerged.sections.length == 0
        ? boardMerged.name
        : `${boardMerged.name}-Other`;
    let section = <section>(<unknown>{
      sectionName: originalName,
      pins: boardMerged.pins,
      creatorId: userId,
      coverImages: boardMerged.coverImages,
    });
    boardOriginal.sections.push(section);
    for (let i = 0; i < boardMerged.pins.length; i++) {
      await this.editPin(
        boardMerged.pins[i].pinId,
        boardOriginalId,
        section._id,
        userId,
      );
    }
    for (let i = 0; i < boardMerged.sections.length; i++) {
      section = <section>(<unknown>{
        sectionName: `${boardMerged.name}-${boardMerged.sections[i].sectionName}`,
        pins: boardMerged.sections[i].pins,
        creatorId: userId,
        coverImages: boardMerged.sections[i].coverImages,
      });

      boardOriginal.sections.push(section);
      for (let j = 0; j < boardMerged.sections[i].pins.length; j++) {
        await this.editPin(
          boardMerged.sections[i].pins[j].pinId,
          boardOriginalId,
          section._id,
          userId,
        );
      }
    }
    let checkDeleted = await this.deleteBoardInMerge(userId, boardMergedId);
    if (!checkDeleted) {
      throw new Error('boards couldnt be merged');
    }
    await boardOriginal.save();
    return boardOriginal;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description delete section
   * @param {string} userId - the id of the user
   * @param {string} boardId - the id of the board
   * @param {string} sectionId - the id of the section
   * @returns  {Promise<boolean>}
   */
  async deleteSection(boardId, sectionId, userId) {
    if (
      (await this.ValidationService.checkMongooseID([
        boardId,
        userId,
        sectionId,
      ])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }

    let board = await this.boardModel.findById(boardId, {
      sections: 1,
      creator: 1,
    });
    if (!board) {
      throw new BadRequestException('not valid board');
    }

    for (let i = 0; i < board.sections.length; i++) {
      if (String(board.sections[i]._id) == String(sectionId)) {
        let isAuthorized =
          String(board.sections[i].creatorId) == String(userId) ||
          String(board.creator.id) == String(userId);
        if (!isAuthorized) {
          throw new UnauthorizedException(
            'this user is unauthorized to delete the section',
          );
        }
        for (let k = 0; k < board.sections[i].pins.length; k++) {
          let isDeleted = await this.deletePinFromBoardSection(
            String(board.sections[i].pins[k].pinId),
            userId,
            boardId,
            String(board.sections[i]._id),
          );
          if (!isDeleted) {
            throw new Error("error while deleting section's pins");
          }
        }
        board.sections.splice(i, 1);
        await board.save().catch(err => {
          console.log(err);
        });
        return true;
      }
    }
    return false;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description unsave pin from a board/section
   * @param {string} pinId - the id of the pin
   * @param {string} userId - the id of the user
   * @param {string} boardId - the id of the board
   * @param {string} sectionId - the id of the section
   * @param {boolean} isDelete - flag indicates if the unsave is performed in the delete board/section method
   * @returns  {Promise<boolean>}
   */
  async unsavePin(pinId, boardId, sectionId, userId, isDelete) {
    if (
      (await this.ValidationService.checkMongooseID([
        boardId,
        userId,
        sectionId,
        pinId,
      ])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }
    let user = await this.userModel.findById(userId, { savedPins: 1 });
    if (!user) {
      throw new BadRequestException('not valid user');
    }
    let board = await this.boardModel.findById(boardId, {
      creator: 1,
      sections: 1,
      pins: 1,
      collaborators: 1,
    });
    if (!board) {
      throw new BadRequestException('not valid board');
    }

    if (String(userId) != String(board.creator.id)) {
      throw new UnauthorizedException();
    }
    let found = false;
    if (!isDelete) {
      if (sectionId) {
        for (let k = 0; k < board.sections.length; k++) {
          if (String(board.sections[k]._id) == String(sectionId)) {
            for (let i = 0; i < board.sections[k].pins.length; i++) {
              if (String(board.sections[k].pins[i].pinId) == String(pinId)) {
                board.sections[k].pins.splice(i, 1);
                await board.save();
                break;
              }
            }
            break;
          }
        }
      } else {
        for (let i = 0; i < board.pins.length; i++) {
          if (String(board.pins[i].pinId) == String(pinId)) {
            board.pins.splice(i, 1);
            await board.save();
            break;
          }
        }
      }
    }
    for (let j = 0; j < user.savedPins.length; j++) {
      if (String(user.savedPins[j].pinId) == String(pinId)) {
        user.savedPins.splice(j, 1);
        found = true;
        await user.save().catch(err => {
          console.log(err);
        });
        break;
      }
    }
    if (!found) {
      for (let i = 0; i < board.collaborators.length; i++) {
        let collaborator = await this.userModel.findById(
          board.collaborators[i].collaboratorId,
          { savedPins: 1 },
        );
        if (collaborator) {
          for (let j = 0; j < collaborator.savedPins.length; j++) {
            if (String(collaborator.savedPins[j].pinId) == String(pinId)) {
              collaborator.savedPins.splice(j, 1);
              found = true;
              break;
            }
          }
        }
      }
    }

    return found;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description edit pin's board/section in the merge boards process
   * @param {string} pinId - the id of the pin
   * @param {string} userId - the id of the user
   * @param {string} boardId - the id of the new pin's board
   * @param {string} sectionId - the id of the new pin's section
   * @returns  {Promise<boolean>}
   */
  async editPin(pinId, boardId, sectionId, userId) {
    if (
      (await this.ValidationService.checkMongooseID([
        boardId,
        pinId,
        sectionId,
        userId,
      ])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }
    let user = await this.userModel.findById(userId, {
      pins: 1,
      savedPins: 1,
      lastName: 1,
      firstName: 1,
    });
    if (!user) {
      throw new BadRequestException('not valid user');
    }
    let board = await this.boardModel.findById(boardId, { collaborators: 1 });
    if (!board) {
      throw new BadRequestException('not valid board');
    }
    let pin = await this.pinModel.findById(pinId, {
      board: 1,
      section: 1,
      creator: 1,
    });
    if (!pin) {
      throw new BadRequestException('not valid pin');
    }
    let found = false;
    for (let i = 0; i < user.pins.length; i++) {
      if (String(user.pins[i].pinId) == String(pinId)) {
        user.pins[i].boardId = boardId;
        user.pins[i].sectionId = sectionId;
        pin.board = boardId;
        pin.section = sectionId;
        await user.save();
        await pin.save();
        found = true;
        break;
      }
    }
    for (let i = 0; i < user.savedPins.length; i++) {
      if (String(user.savedPins[i].pinId) == String(pinId)) {
        user.savedPins[i].boardId = boardId;
        user.savedPins[i].sectionId = sectionId;
        await user.save();
        found = true;
        break;
      }
    }
    if (!found) {
      for (let i = 0; i < board.collaborators.length; i++) {
        let collaborator = await this.userModel.findById(
          board.collaborators[i].collaboratorId,
          { pins: 1, savedPins: 1 },
        );
        if (collaborator) {
          for (let j = 0; j < collaborator.pins.length; j++) {
            if (String(collaborator.pins[j].pinId) == String(pinId)) {
              user.pins.push({
                pinId: collaborator.pins[j].pinId,
                boardId: boardId,
                sectionId: sectionId,
              });
              pin.creator.id = userId;
              pin.creator.lastName = user.lastName;
              pin.creator.firstName = user.firstName;
              pin.board = boardId;
              pin.section = sectionId;
              collaborator.pins.splice(j, 1);
              await user.save();
              await collaborator.save();
              await pin.save();
              found = true;
              break;
            }
          }
          if (!found) {
            for (let j = 0; j < collaborator.savedPins.length; j++) {
              if (String(collaborator.savedPins[j].pinId) == String(pinId)) {
                user.savedPins.push({
                  pinId: collaborator.savedPins[j].pinId,
                  boardId: boardId,
                  sectionId: sectionId,
                  note: '',
                });
                collaborator.savedPins.splice(j, 1);
                await user.save();
                await collaborator.save();
                found = true;
                break;
              }
            }
          }
        }
        if (found) {
          break;
        }
      }
    }

    return true;
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description get full detailed board object
   * @param {string} userId - the id of the user
   * @param {string} boardId - the id of the board
   * @returns  {Promise<object>}
   */
  async getBoardFull(boardId, userId) {
    if (
      (await this.ValidationService.checkMongooseID([boardId, userId])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }
    let user = await this.userModel.findById(userId, { savedPins: 1 });
    if (!user) {
      throw new BadRequestException('not valid user');
    }
    let board = await this.boardModel.findById(boardId, {
      pins: 1,
      creator: 1,
      collaborators: 1,
      status: 1,
      name: 1,
      description: 1,
      coverImages: 1,
      sections: 1,
    });
    if (!board) {
      throw new BadRequestException('not valid board');
    }
    board.coverImages = [];
    for (let c = 0; c < 3; c++) {
      if (c < board.pins.length) {
        let coverPin = await this.pinModel.findById(board.pins[c].pinId, {
          imageId: 1,
        });
        board.coverImages.push(coverPin.imageId);
      }
    }
    let pins = [];
    for (let i = 0; i < board.sections.length; i++) {
      board.sections[i].coverImages = [];
      for (let c = 0; c < 3; c++) {
        if (c < board.sections[i].pins.length) {
          let coverPin = await this.pinModel.findById(
            board.sections[i].pins[c].pinId,
            { imageId: 1 },
          );
          board.sections[i].coverImages.push(coverPin.imageId);
        }
      }
    }
    for (let i = 0; i < board.pins.length; i++) {
      let pinType = 'none';
      let pin = await this.pinModel.findById(board.pins[i].pinId, {
        creator: 1,
        imageId: 1,
        imageHeight: 1,
        imageWidth: 1,
      });
      if (String(pin.creator.id) == String(userId)) {
        pinType = 'creator';
      } else {
        for (let k = 0; k < user.savedPins.length; k++) {
          if (String(user.savedPins[k].pinId) == String(pin._id)) {
            pinType = 'saved';
            break;
          }
        }
      }
      if (pin) {
        pins.push({ pin: pin, type: pinType });
      }
    }
    let type = 'none';
    let permissions = {};
    if (String(userId) == String(board.creator.id)) {
      type = 'creator';
    } else {
      for (let i = 0; i < board.collaborators.length; i++) {
        if (String(userId) == String(board.collaborators[i].collaboratorId)) {
          type = 'collaborator';
          permissions = {
            savePin: board.collaborators[i].savePin,
            createPin: board.collaborators[i].createPin,
            addCollaborators: board.collaborators[i].addCollaborators,
            editDescription: board.collaborators[i].editDescription,
            editTitle: board.collaborators[i].editTitle,
            personalization: board.collaborators[i].personalization,
          };
          break;
        }
      }
    }
    return { board: board, pins: pins, type: type, permissions: permissions };
  }
  /**
   * @author Nada AbdElmaboud <nada5aled52@gmail.com>
   * @description get full detailed section object
   * @param {string} userId - the id of the user
   * @param {string} boardId - the id of the board
   * @param {string} sectionId - the id of the section
   * @returns  {Promise<object>}
   */
  async getSectionFull(boardId, sectionId, userId) {
    if (
      (await this.ValidationService.checkMongooseID([
        boardId,
        sectionId,
        userId,
      ])) == 0
    ) {
      throw new BadRequestException('not valid id');
    }
    let user = await this.userModel.findById(userId, {
      savedPins: 1,
    });
    if (!user) {
      throw new BadRequestException('not valid user');
    }
    let board = await this.boardModel.findById(boardId, {
      creator: 1,
      collaborators: 1,
      sections: 1,
    });
    if (!board) {
      throw new BadRequestException('not valid board');
    }
    let pins = [];
    let sectionIndex;
    for (let j = 0; j < board.sections.length; j++) {
      if (String(board.sections[j]._id) == String(sectionId)) {
        sectionIndex = j;
        for (let i = 0; i < board.sections[j].pins.length; i++) {
          let pinType = 'none';
          let pin = await this.pinModel.findById(
            board.sections[j].pins[i].pinId,
            {
              creator: 1,
              imageId: 1,
              imageHeight: 1,
              imageWidth: 1,
            },
          );
          if (String(pin.creator.id) == String(userId)) {
            pinType = 'creator';
          } else {
            for (let k = 0; k < user.savedPins.length; k++) {
              if (String(user.savedPins[k].pinId) == String(pin._id)) {
                pinType = 'saved';
                break;
              }
            }
          }
          if (pin) {
            pins.push({ pin: pin, type: pinType });
          }
        }
        break;
      }
    }
    let type = 'none';
    let permissions = {};
    if (String(userId) == String(board.creator.id)) {
      type = 'creator';
    } else {
      for (let i = 0; i < board.collaborators.length; i++) {
        if (String(userId) == String(board.collaborators[i].collaboratorId)) {
          type = 'collaborator';
          permissions = {
            savePin: board.collaborators[i].savePin,
            createPin: board.collaborators[i].createPin,
            addCollaborators: board.collaborators[i].addCollaborators,
            editDescription: board.collaborators[i].editDescription,
            editTitle: board.collaborators[i].editTitle,
            personalization: board.collaborators[i].personalization,
          };
          break;
        }
      }
    }
    return {
      section: board.sections[sectionIndex],
      pins: pins,
      type: type,
      permissions: permissions,
    };
  }
}
