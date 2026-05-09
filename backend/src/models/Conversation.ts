import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const conversationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['direct'],
      default: 'direct',
      index: true,
    },
    participants: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      validate: {
        validator: (arr: any[]) => Array.isArray(arr) && arr.length === 2,
        message: 'Direct conversations must have exactly 2 participants',
      },
      index: true,
    },
    participantsKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastMessageText: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    lastMessageSender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

conversationSchema.pre('validate', function (next) {
  try {
    const doc = this as any;
    const ids = (doc.participants || []).map((id: any) => String(id)).filter(Boolean);
    if (ids.length !== 2) return next();
    const [a, b] = ids.sort();
    doc.participantsKey = `${a}:${b}`;
    return next();
  } catch (e) {
    return next(e as any);
  }
});

export type ConversationDocument = InferSchemaType<typeof conversationSchema>;

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
export default Conversation;
