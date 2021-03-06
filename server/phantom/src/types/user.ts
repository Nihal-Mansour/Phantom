import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
export interface user extends Document {
  firstName: String;
  lastName: String;
  userName: String;
  location: String;
  email: String;
  password: String;
  country: String;
  boardsForYou: Boolean;
  popularPins: Boolean;
  pinsForYou: Boolean;
  activity: Boolean;
  invitation: Boolean;
  boardUpdate: Boolean;
  activateaccount: Boolean;
  followNotification: Boolean;
  pinsNotification: Boolean;
  pinsInspired: Boolean;
  birthDate: Date;
  about: String;
  facebook: Boolean;
  google: Boolean;
  notificationOfPinsActivity: Boolean;
  gender: String;
  googleImage: String;
  sortType: String;
  socketId: string;
  notificationCounter: number;
  profileImage: String;
  lastTopics: Array<{
    topicName: String;
    pinsLength: Number;
  }>;
  history: Array<{
    topic: String;
    pinId: mongoose.Types.ObjectId;
  }>;
  pins: Array<{
    pinId: mongoose.Types.ObjectId;
    boardId: mongoose.Types.ObjectId;
    sectionId: mongoose.Types.ObjectId;
  }>;
  savedPins: Array<{
    pinId: mongoose.Types.ObjectId;
    boardId: mongoose.Types.ObjectId;
    sectionId: mongoose.Types.ObjectId;
    note: String;
  }>;
  recentSearch: Array<String>;
  confirm: Boolean;
  fcmToken: String;
  homeFeed: Array<Object>;
  followingTopics: Array<mongoose.Types.ObjectId>;
  notifications: [{}];
  offlineNotifications: [{}];
  followers: Array<mongoose.Types.ObjectId>;
  following: Array<mongoose.Types.ObjectId>;
  boards: [
    {
      boardId: mongoose.Types.ObjectId;
      name: String;
      createdAt: Date;
      isJoined: Boolean;
      createdOrjoined: String;
    },
  ];
  viewState: string;
  counts: {
    likes: Number;
    comments: Number;
    repins: Number;
    saves: Number;
  };
  createdAt: Date;
}
