import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';
import JSZip from 'jszip';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 20, // max 20 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WEBP, GIF, BMP, TIFF are allowed.'));
    }
  },
});

async function startServer() {
  // API Routes
  app.post('/api/convert', upload.array('images', 20), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const format = req.body.format as string;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      if (!['jpeg', 'png', 'webp', 'avif', 'gif'].includes(format)) {
        return res.status(400).json({ error: 'Invalid output format' });
      }

      const convertedFiles = await Promise.all(
        files.map(async (file) => {
          let pipeline = sharp(file.buffer);
          
          // Convert to requested format
          switch (format) {
            case 'jpeg':
              pipeline = pipeline.jpeg({ quality: 80 });
              break;
            case 'png':
              pipeline = pipeline.png();
              break;
            case 'webp':
              pipeline = pipeline.webp({ quality: 80 });
              break;
            case 'avif':
              pipeline = pipeline.avif({ quality: 50 });
              break;
            case 'gif':
              pipeline = pipeline.gif();
              break;
          }

          const buffer = await pipeline.toBuffer();
          const originalName = path.parse(file.originalname).name;
          return {
            name: `${originalName}.${format}`,
            buffer,
            mimeType: `image/${format === 'jpeg' ? 'jpeg' : format}`,
          };
        })
      );

      if (convertedFiles.length === 1) {
        // Single file: return as direct download
        res.setHeader('Content-Type', convertedFiles[0].mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${convertedFiles[0].name}"`);
        return res.send(convertedFiles[0].buffer);
      } else {
        // Multiple files: return as ZIP
        const zip = new JSZip();
        convertedFiles.forEach((file) => {
          zip.file(file.name, file.buffer);
        });
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="converted_images.zip"');
        return res.send(zipBuffer);
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
