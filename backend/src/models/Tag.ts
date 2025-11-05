import mongoose, { Schema, Document } from 'mongoose';

export interface ITag extends Document {
  name: string;
  description?: string;
  color?: string;
  commitHash: string;
  notebook: mongoose.Types.ObjectId;
  createdAt: Date;
}

const TagSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: '#3b82f6',
    },
    commitHash: {
      type: String,
      required: true,
    },
    notebook: {
      type: Schema.Types.ObjectId,
      ref: 'Notebook',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index: unique tag name per notebook
TagSchema.index({ notebook: 1, name: 1 }, { unique: true });

export default mongoose.model<ITag>('Tag', TagSchema);
