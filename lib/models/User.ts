import mongoose, { Schema, Document } from 'mongoose';

interface IUser extends Document {
  name: string;
  username: string;
  email: string;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);