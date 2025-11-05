import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  content: string;
  author: mongoose.Types.ObjectId;
  commit?: mongoose.Types.ObjectId;
  pullRequest?: mongoose.Types.ObjectId;
  lineNumber?: number;
  filePath?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    commit: {
      type: Schema.Types.ObjectId,
      ref: 'Commit',
    },
    pullRequest: {
      type: Schema.Types.ObjectId,
      ref: 'PullRequest',
    },
    lineNumber: {
      type: Number,
    },
    filePath: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CommentSchema.index({ commit: 1 });
CommentSchema.index({ pullRequest: 1 });
CommentSchema.index({ author: 1 });

export default mongoose.model<IComment>('Comment', CommentSchema);
