import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  description?: string;
  isDefault: boolean;
  notebook: mongoose.Types.ObjectId;
  lastCommitHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    notebook: {
      type: Schema.Types.ObjectId,
      ref: 'Notebook',
      required: true,
    },
    lastCommitHash: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: unique branch name per notebook
BranchSchema.index({ notebook: 1, name: 1 }, { unique: true });

export default mongoose.model<IBranch>('Branch', BranchSchema);
