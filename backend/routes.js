const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// --- AUTHENTICATION ---
router.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  // TODO: Hash password, save user to DB, generate JWT
  res.json({ success: true, user: { id: '1', email, name }, token: 'mock-jwt-token' });
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  // TODO: Validate user, check password
  res.json({ success: true, user: { id: '1', email, name: 'User' }, token: 'mock-jwt-token' });
});

// --- FILES ---
router.get('/files', (req, res) => {
  // TODO: Fetch files for authenticated user
  res.json({ success: true, files: [] });
});

router.post('/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  // TODO: Upload to S3/Cloudinary, save metadata to DB
  res.json({ 
    success: true, 
    file: { 
      id: Date.now().toString(), 
      name: req.file.originalname,
      size: req.file.size,
      url: 'https://mock-url.com/file.png' 
    } 
  });
});

router.delete('/files/:id', (req, res) => {
  // TODO: Delete from storage and DB
  res.json({ success: true, message: 'File deleted' });
});

module.exports = router;