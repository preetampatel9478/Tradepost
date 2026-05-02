import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const postSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    sentiment: {
      type: String,
      default: 'neutral',
      enum: ['bullish', 'bearish', 'neutral'],
    },
    mediaUrls: {
      type: [String],
      default: [],
    },

    // Extracted tokens from content (e.g. "@trader_john", "#NIFTY")
    mentions: {
      type: [String],
      default: [],
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export type PostDocument = InferSchemaType<typeof postSchema>;

const Post = mongoose.models.Post || mongoose.model('Post', postSchema);
export default Post;
