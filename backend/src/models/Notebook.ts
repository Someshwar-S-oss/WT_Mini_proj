import mongoose, { Schema, Document } from 'mongoose';

export enum CollaboratorRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export interface ICollaborator {
  user: mongoose.Types.ObjectId;
  role: CollaboratorRole;
  addedAt: Date;
}

export interface INotebook extends Document {
  name: string;
  description?: string;
  courseName?: string;
  courseCode?: string;
  isPublic: boolean;
  gitRepoPath: string;
  owner: mongoose.Types.ObjectId;
  collaborators: ICollaborator[];
  starCount: number;
  forkCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CollaboratorSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: Object.values(CollaboratorRole),
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const NotebookSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    courseName: {
      type: String,
      trim: true,
    },
    courseCode: {
      type: String,
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    gitRepoPath: {
      type: String,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collaborators: [CollaboratorSchema],
    starCount: {
      type: Number,
      default: 0,
    },
    forkCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
NotebookSchema.index({ owner: 1 });
NotebookSchema.index({ courseName: 1 });
NotebookSchema.index({ isPublic: 1 });

export default mongoose.model<INotebook>('Notebook', NotebookSchema);
