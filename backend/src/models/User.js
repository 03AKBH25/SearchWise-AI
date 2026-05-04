import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  firstName: String,
  lastName: String,
  name: String,
  password: {
    type: String,
    select: false
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  preferences: {
    goal: String,
    horizon: String,
    risk: String,
    experience: String,
    preference: String
  },
  avatar: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

export default User;
