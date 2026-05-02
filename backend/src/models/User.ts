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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export type UserDocument = InferSchemaType<typeof userSchema>;

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
