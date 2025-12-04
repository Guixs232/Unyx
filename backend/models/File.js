const mongoose = require('mongoose');

const fileSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true, 
      enum: ['image', 'video', 'document', 'folder', 'link'],
    },
    size: {
      type: Number,
      required: true, // Size in bytes
    },
    url: {
      type: String,
      required: true, // S3 URL or local path
    },
    thumbnail: {
      type: String,
    },
    tags: [String],
    description: {
      type: String,
    },
    parentId: {
      type: String,
      default: null, // For nested folders
    },
    deletedAt: {
      type: Date,
      default: null, // Soft delete
    },
    versions: [
      {
        date: Date,
        size: String,
        url: String
      }
    ]
  },
  {
    timestamps: true,
  }
);

const File = mongoose.model('File', fileSchema);

module.exports = File;