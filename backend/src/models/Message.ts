import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export type MessageDocument = InferSchemaType<typeof messageSchema>;

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export default Message;
