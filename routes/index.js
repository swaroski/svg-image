/*
const express = require('express');
const router = express.Router();
const axios = require('axios');
const potrace = require('potrace');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Enable CORS
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Serve the main HTML file
router.get('/', (req, res) => {
  res.sendFile(__dirname + '/../public/index.html');
});

// OpenAI API configuration
const apiKey = "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"
const openaiUrl = 'https://api.openai.com/v1/images/generations';


// Directory for saving generated images
const saveDirectory = path.join(__dirname, '..', 'saved-images'); // Path to 'saved-images' directory

// Ensure the save directory exists, create it if not
if (!fs.existsSync(saveDirectory)) {
  fs.mkdirSync(saveDirectory, { recursive: true });
}

// Route for generating images
router.post('/generate-image', async (req, res) => {
  try {
    // Get the selected image size from the client-side
    const imageSize = req.body.size || "1024x1024";

    // Generate the image using the OpenAI API with the selected size
    const response = await axios.post(openaiUrl, {
      model: "dall-e-3",
      prompt: req.body.data,
      n: 1,
      size: imageSize,
    }, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const imageUrl = response.data.data[0].url;

    // Vectorize the image on the server side
    vectorizeImage(imageUrl, (svgData) => {
      if (svgData) {
        // Generate a unique filename
        const filename = `image-${Date.now()}.svg`;
        const filePath = path.join(saveDirectory, filename);

        // Save SVG data to file
        fs.writeFile(filePath, svgData, (err) => {
          if (err) {
            console.error('Error saving SVG file:', err);
            res.status(500).json({ success: false, error: 'Failed to save SVG file' });
          } else {
            console.log('SVG file saved successfully:', filePath);

            // Send the image URL, SVG data, and file path to the client
            res.json({ success: true, imageUrl, svgData, filePath });
          }
        });
      } else {
        console.error('Error vectorizing image:', imageUrl);
        res.status(500).json({ success: false, error: 'Error vectorizing image' });
      }
    });
  } catch (error) {
    console.error('OpenAI API Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Proxy route for fetching images
router.get('/proxy', async (req, res) => {
  const imageUrl = decodeURIComponent(req.query.url);

  try {
    // Fetch the image from OpenAI
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    // Set the appropriate content type based on the image type
    const contentType = response.headers['content-type'];
    res.setHeader('Content-Type', contentType);

    // Send the image data to the client
    res.end(Buffer.from(response.data, 'binary)'));
  } catch (error) {
    console.error('Error proxying image:', error.response ? error.response.status : error.message);
    res.status(error.response ? error.response.status : 500).send('Internal Server Error');
  }
});

// Function to vectorize an image
function vectorizeImage(imageUrl, callback) {
  axios.get(imageUrl, { responseType: 'arraybuffer' })
    .then(response => {
      const imageBuffer = Buffer.from(response.data);
      potrace.trace(imageBuffer, (err, svg) => {
        if (err) {
          console.error('Error vectorizing image:', err);
          callback(null); // Pass null to indicate failure
        } else {
          console.log('Vectorization result:', svg);
          callback(svg);
        }
      });
    })
    .catch(error => {
      console.error('Error downloading image for vectorization:', error);
      callback(null); // Pass null to indicate failure
    });
}

module.exports = router;
*/ 



// routes/index.js
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const potrace = require('potrace');
const { fal } = require('@fal-ai/client');
require('dotenv').config();

const router = express.Router();

// Configure Fal.AI with your API key (set in .env as FAL_KEY)
fal.config({
  apiKey: process.env.FAL_KEY, // e.g., FAL_KEY=your_api_key
});

// Create a directory for saving generated SVG images
const saveDirectory = path.join(__dirname, '..', 'generated_images');
if (!fs.existsSync(saveDirectory)) {
  fs.mkdirSync(saveDirectory, { recursive: true });
}

// (Optional) Enable CORS headers for this router
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

/**
 * POST /generate-image
 * Expects a JSON body with a "prompt" property.
 */
router.post('/generate-image', async (req, res) => {
  console.log("DEBUG: Incoming request body:", req.body);
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "❌ Missing prompt in request" });
  }
  console.log(`Generating image for prompt: ${prompt}`);

  try {
    // Call Fal.AI's API with the prompt
    const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra", {
      input: { prompt },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log("Processing...");
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });
    console.log("Fal.AI Response:", result);

    // Check if an image was returned
    if (!result || !result.data || !result.data.images || result.data.images.length === 0) {
      console.error("Fal.AI returned no images.");
      return res.status(500).json({ error: "Image generation failed" });
    }

    // Grab the first image URL
    const imageUrl = result.data.images[0].url;
    console.log(`Generated Image URL: ${imageUrl}`);

    // Convert the image to SVG via vectorization
    vectorizeImage(imageUrl, (svgData) => {
      if (svgData) {
        const filename = `image-${Date.now()}.svg`;
        const filePath = path.join(saveDirectory, filename);

        fs.writeFile(filePath, svgData, (err) => {
          if (err) {
            console.error('Error saving SVG file:', err);
            return res.status(500).json({ success: false, error: 'Failed to save SVG file' });
          }
          console.log('SVG file saved:', filePath);
          return res.json({ success: true, imageUrl, svgData, filePath });
        });
      } else {
        console.error('Error vectorizing image:', imageUrl);
        return res.status(500).json({ success: false, error: 'Error vectorizing image' });
      }
    });
  } catch (error) {
    console.error("Fal.AI API Error:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

/**
 * Utility function to vectorize an image using potrace.
 * Downloads the image from imageUrl and converts it to SVG.
 */
function vectorizeImage(imageUrl, callback) {
  axios.get(imageUrl, { responseType: 'arraybuffer' })
    .then(response => {
      const imageBuffer = Buffer.from(response.data);
      potrace.trace(imageBuffer, (err, svg) => {
        if (err) {
          console.error('Error vectorizing image:', err);
          callback(null);
        } else {
          console.log('Vectorization result:', svg);
          callback(svg);
        }
      });
    })
    .catch(error => {
      console.error('Error downloading image for vectorization:', error);
      callback(null);
    });
}

module.exports = router;
