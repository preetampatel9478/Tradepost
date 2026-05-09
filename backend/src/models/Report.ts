import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const reportSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    postAuthor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      enum: ['spam', 'harassment', 'fake_stock_tips', 'scam', 'hate_speech', 'misinformation'],
      index: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'reviewed', 'actioned', 'rejected'],
      default: 'open',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Prevent duplicates: same reporter reporting same post for same reason.
reportSchema.index({ post: 1, reporter: 1, reason: 1 }, { unique: true });

export type ReportDocument = InferSchemaType<typeof reportSchema>;

const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
export default Report;
