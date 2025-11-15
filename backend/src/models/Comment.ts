import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  content: string;
  author: mongoose.Types.ObjectId;
  notebook: mongoose.Types.ObjectId;
  commit?: mongoose.Types.ObjectId;
  pullRequest?: mongoose.Types.ObjectId;
  lineNumber?: number;
  filePath?: string;
  parentComment?: mongoose.Types.ObjectId;
  replies: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notebook: {
      type: Schema.Types.ObjectId,
      ref: 'Notebook',
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
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
    },
    replies: [{
      type: Schema.Types.ObjectId,
      ref: 'Comment',
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
CommentSchema.index({ notebook: 1, createdAt: -1 });
CommentSchema.index({ commit: 1, createdAt: -1 });
CommentSchema.index({ pullRequest: 1 });
CommentSchema.index({ author: 1 });
CommentSchema.index({ parentComment: 1 });

export default mongoose.model<IComment>('Comment', CommentSchema);
