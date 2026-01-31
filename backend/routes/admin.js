const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const DB_PATH = path.join(__dirname, '..', 'questionnaire.db');

// Download database backup (admin only)
router.get('/backup/database', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `tiaojiao-backup-${timestamp}.db`;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(DB_PATH);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Get backup info (admin only)
router.get('/backup/info', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    const stats = fs.statSync(DB_PATH);
    res.json({
      size: stats.size,
      sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
      lastModified: stats.mtime
    });
  } catch (error) {
    console.error('Backup info error:', error);
    res.status(500).json({ error: 'Failed to get backup info' });
  }
});

module.exports = router;
