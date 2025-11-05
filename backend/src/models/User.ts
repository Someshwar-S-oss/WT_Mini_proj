import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username: string;
  password: string;
  name: string;
  university?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    university: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

export default mongoose.model<IUser>('User', UserSchema);
