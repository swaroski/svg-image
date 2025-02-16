import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import potrace from 'potrace';
import { fal } from '@fal-ai/client';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

dotenv.config();

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Example directory where SVGs (and potentially other images) will be saved
const imageSaveDirectory = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imageSaveDirectory)) {
  fs.mkdirSync(imageSaveDirectory, { recursive: true });
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Serve a simple index page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * POST /generate-image
 * 
 * Expects a JSON body containing { "prompt": "some text..." }
 */
app.post('/generate-image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request' });
  }

  console.log(`🔥 Generating image for prompt: ${prompt}`);

  try {
    // Call Fal.AI’s Recraft model with the prompt
    const result = await fal.subscribe('fal-ai/flux-pro/v1.1-ultra', {
      input: { prompt },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
      fetch, // ✅ Explicitly pass fetch
    });

    console.log('✅ Fal.AI Response:', result);

    if (!result.data || !result.data.images || result.data.images.length === 0) {
      console.error('❌ Fal.AI returned no images.');
      return res.status(500).json({ error: 'Image generation failed' });
    }

    // Grab the first image URL from the response
    const imageUrl = result.data.images[0].url;
    console.log(`✅ Generated Image URL: ${imageUrl}`);

    // Send the URL back to the client
    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error('🔥 Fal.AI API Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * POST /convert-to-svg
 * 
 * Expects { "imageUrl": "URL to raster image" } in the body
 * Converts the image to SVG using potrace, saves it, and returns the path
 */
app.post('/convert-to-svg', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required for SVG conversion' });
    }

    vectorizeImage(imageUrl, (svgData) => {
      if (svgData) {
        const filename = `image-${Date.now()}.svg`;
        const filePath = path.join(imageSaveDirectory, filename);

        fs.writeFile(filePath, svgData, (err) => {
          if (err) {
            console.error('❌ Error saving SVG file:', err);
            return res.status(500).json({ success: false, error: 'Failed to save SVG file' });
          }

          console.log('✅ SVG file saved:', filePath);
          return res.json({ success: true, svgData, filePath });
        });
      } else {
        console.error('❌ Error vectorizing image:', imageUrl);
        return res.status(500).json({ success: false, error: 'Error vectorizing image' });
      }
    });
  } catch (error) {
    console.error('🔥 SVG Conversion Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * Utility function to download an image from `imageUrl`,
 * then pass its buffer to potrace to convert it into SVG.
 */
function vectorizeImage(imageUrl, callback) {
  axios
    .get(imageUrl, { responseType: 'arraybuffer' })
    .then((response) => {
      const imageBuffer = Buffer.from(response.data);

      potrace.trace(imageBuffer, (err, svg) => {
        if (err) {
          console.error('Error vectorizing image:', err);
          callback(null);
        } else {
          console.log('✅ Vectorization result:', svg);
          callback(svg);
        }
      });
    })
    .catch((error) => {
      console.error('❌ Error downloading image for vectorization:', error);
      callback(null);
    });
}

// ✅ Export the app for serverless deployments (e.g., Vercel)
export default app;

// ✅ Optional: Optimize for Edge Functions on Vercel
export const config = {
  runtime: "edge",
};

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});