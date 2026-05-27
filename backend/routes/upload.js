const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Use persistent disk path in production, local path in development
const uploadsDir = process.env.NODE_ENV === 'production'
  ? '/data/uploads'
  : path.join(__dirname, '..', 'uploads');

// Upload response image (any user)
router.post('/response-image', (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Extract base64 data and mime type
    const matches = image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    const extension = matches[1].replace('+', '');
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    // Check file size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large (max 5MB)' });
    }

    // Generate unique filename
    const filename = `response-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    fs.writeFileSync(filepath, buffer);

    // Return the URL path
    res.json({
      url: `/uploads/${filename}`,
      filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload image (admin only)
router.post('/image', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Extract base64 data and mime type
    const matches = image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    const extension = matches[1].replace('+', '');
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    // Generate unique filename
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    fs.writeFileSync(filepath, buffer);

    // Return the URL path
    res.json({
      url: `/uploads/${filename}`,
      filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Delete image (admin only)
router.delete('/image/:filename', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(uploadsDir, filename);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    res.json({ message: 'Image deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;
