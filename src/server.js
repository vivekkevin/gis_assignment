import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Enable ES module __dirname / __filename equivalents
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views')); // adjust if your views folder is in root

// Serve static files (CSS/JS/images) from /public
app.use(express.static(path.join(__dirname, '../public')));

// Root → redirect to /map
app.get('/', (req, res) => {
  res.redirect('/map');
});

app.get('/leaflet', (req, res) => {
  res.render('leaflet');
});

// Map route
app.get('/map', (req, res) => {
  res.render('map', { MAPBOX_TOKEN: process.env.MAPBOX_TOKEN });
});

// Start server
// replace your app.listen(...) with this exact block
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`✅ Server running at http://${HOST}:${PORT}`);
});

