import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint
app.get('/api/init', (req, res) => {
  // Simulate connecting to an external web service
  setTimeout(() => {
    res.json({ message: 'Initialization complete' });
  }, 1000);
});

app.listen(PORT, () => {
  console.log(`Soulscapes Server running on port ${PORT}`);
});
