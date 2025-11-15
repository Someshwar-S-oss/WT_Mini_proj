import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
  notebook: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: 'commit' | 'branch_created' | 'branch_deleted' | 'collaborator_added' | 'collaborator_removed' | 'file_uploaded' | 'notebook_created' | 'notebook_forked' | 'comment_added';
  description: string;
  metadata?: any;
  createdAt: Date;
}

const ActivitySchema: Schema = new Schema(
  {
    notebook: {
      type: Schema.Types.ObjectId,
      ref: 'Notebook',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['commit', 'branch_created', 'branch_deleted', 'collaborator_added', 'collaborator_removed', 'file_uploaded', 'notebook_created', 'notebook_forked', 'comment_added'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ActivitySchema.index({ notebook: 1, createdAt: -1 });
ActivitySchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<IActivity>('Activity', ActivitySchema);
