import bcrypt from 'bcrypt';
import User from '../models/User';
import { generateToken } from '../utils/jwt';

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  name: string;
  university?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  async register(data: RegisterData): Promise<{ user: any; token: string }> {
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: data.email }, { username: data.username }],
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await User.create({
      ...data,
      password: hashedPassword,
    });

    // Generate token
    const token = generateToken({
      userId: (user._id as any).toString(),
      username: user.username,
    });

    // Remove password from response
    const userObj = user.toObject() as any;
    delete userObj.password;

    return { user: userObj, token };
  }

  async login(data: LoginData): Promise<{ user: any; token: string }> {
    // Find user
    const user = await User.findOne({ email: data.email });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = generateToken({
      userId: (user._id as any).toString(),
      username: user.username,
    });

    // Remove password from response
    const userObj = user.toObject() as any;
    delete userObj.password;

    return { user: userObj, token };
  }

  async getUserById(userId: string): Promise<any> {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
