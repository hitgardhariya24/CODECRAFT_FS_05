const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6, select: false },
    avatar: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    bio: { type: String, default: '' },
    about: { type: String, default: '' },
    website: { type: String, default: '' },
    location: { type: String, default: '' },
    profileVisibility: { type: String, enum: ['public', 'private'], default: 'public' },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.index({ username: 'text', name: 'text', bio: 'text', about: 'text' });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getPublicProfile = function getPublicProfile() {
  return {
    _id: this._id,
    name: this.name,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    coverImage: this.coverImage,
    bio: this.bio,
    about: this.about,
    website: this.website,
    location: this.location,
    profileVisibility: this.profileVisibility,
    followersCount: this.followers.length,
    followingCount: this.following.length,
    role: this.role,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);