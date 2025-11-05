import mongoose, { Schema, Document } from 'mongoose';

export interface IFileChange {
  path: string;
  additions: number;
  deletions: number;
}

export interface ICommit extends Document {
  hash: string;
  message: string;
  description?: string;
  author: mongoose.Types.ObjectId;
  notebook: mongoose.Types.ObjectId;
  branch: mongoose.Types.ObjectId;
  parentHash?: string;
  filesChanged: IFileChange[];
  additions: number;
  deletions: number;
  timestamp: Date;
  createdAt: Date;
}

const FileChangeSchema = new Schema({
  path: {
    type: String,
    required: true,
  },
  additions: {
    type: Number,
    default: 0,
  },
  deletions: {
    type: Number,
    default: 0,
  },
});

const CommitSchema: Schema = new Schema(
  {
    hash: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
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
    branch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    parentHash: {
      type: String,
    },
    filesChanged: [FileChangeSchema],
    additions: {
      type: Number,
      default: 0,
    },
    deletions: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
CommitSchema.index({ hash: 1 });
CommitSchema.index({ notebook: 1 });
CommitSchema.index({ branch: 1 });
CommitSchema.index({ author: 1 });
CommitSchema.index({ timestamp: -1 });

export default mongoose.model<ICommit>('Commit', CommitSchema);
