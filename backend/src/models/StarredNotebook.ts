import mongoose, { Schema, Document } from 'mongoose';

export interface IStarredNotebook extends Document {
  user: mongoose.Types.ObjectId;
  notebook: mongoose.Types.ObjectId;
  starredAt: Date;
}

const StarredNotebookSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    notebook: {
      type: Schema.Types.ObjectId,
      ref: 'Notebook',
      required: true,
      index: true,
    },
    starredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure a user can only star a notebook once
StarredNotebookSchema.index({ user: 1, notebook: 1 }, { unique: true });

export default mongoose.model<IStarredNotebook>('StarredNotebook', StarredNotebookSchema);
