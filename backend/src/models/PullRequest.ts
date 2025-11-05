import mongoose, { Schema, Document } from 'mongoose';

export enum PullRequestStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  MERGED = 'MERGED',
}

export interface IPullRequest extends Document {
  title: string;
  description?: string;
  status: PullRequestStatus;
  sourceBranch: mongoose.Types.ObjectId;
  targetBranch: mongoose.Types.ObjectId;
  notebook: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  mergedBy?: mongoose.Types.ObjectId;
  mergedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PullRequestSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(PullRequestStatus),
      default: PullRequestStatus.OPEN,
    },
    sourceBranch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    targetBranch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    notebook: {
      type: Schema.Types.ObjectId,
      ref: 'Notebook',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mergedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    mergedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PullRequestSchema.index({ notebook: 1 });
PullRequestSchema.index({ status: 1 });
PullRequestSchema.index({ author: 1 });

export default mongoose.model<IPullRequest>('PullRequest', PullRequestSchema);
