/*
// app.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Import your routes
const routes = require('./routes');

const app = express();
//const port = 3000;

// Parse incoming JSON and URL-encoded payloads
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS for all routes
app.use(cors());

// (Optional) Set custom CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Use the defined routes (which include /generate-image)
app.use('/', routes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
*/


const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Import your routes
const routes = require('./routes');

const app = express();

// Parse incoming JSON and URL-encoded payloads
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS for all routes
app.use(cors());

// (Optional) Set custom CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Use the defined routes (which include /generate-image)
app.use('/', routes);

// ✅ Export the app for Vercel (No `app.listen()`)
module.exports = app;

// ✅ Optional: Optimize for Edge Functions on Vercel
export const config = {
  runtime: "edge",
};
