import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      default: '',
      maxlength: 180,
    },
    userId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: true,
    },
    profilePhoto: {
      type: String,
      default: '',
    },

    // User preferences / settings
    language: {
      type: String,
      default: 'en',
      trim: true,
    },
    accountPrivate: {
      type: Boolean,
      default: false,
    },
    notifyPush: {
      type: Boolean,
      default: true,
    },
    notifyEmail: {
      type: Boolean,
      default: false,
    },
    themeMode: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    tc_accepted: {
      type: Boolean,
      default: false,
    },
    tc_timestamp: {
      type: Date,
      default: null,
    },
    tc_device: {
      type: String,
      default: '',
    },

    // Social graph (persisted)
    followers: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      select: false,
    },
    following: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      select: false,
    },
    followerCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export type UserDocument = InferSchemaType<typeof userSchema>;

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
