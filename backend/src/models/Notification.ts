import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['like', 'comment'],
      index: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
      index: true,
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    message: {
      type: String,
      default: '',
      maxlength: 300,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Prevent duplicate "like" notifications for same actor+post.
notificationSchema.index(
  { recipient: 1, actor: 1, type: 1, post: 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'like', post: { $type: 'objectId' } },
  }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export default Notification;
