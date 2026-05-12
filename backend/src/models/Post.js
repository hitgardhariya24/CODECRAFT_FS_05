const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    url: String,
    type: { type: String, enum: ['image', 'video'], required: true },
    caption: String,
    originalName: String,
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    location: { type: String, default: '' },
    media: [mediaSchema],
    hashtags: [{ type: String, index: true }],
    taggedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    visibility: { type: String, enum: ['public', 'followers'], default: 'public' },
  },
  { timestamps: true }
);

postSchema.index({ text: 'text', hashtags: 'text' });

module.exports = mongoose.model('Post', postSchema);