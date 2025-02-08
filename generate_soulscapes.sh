#!/bin/bash

# Create the main project directory
mkdir -p soulscapes
cd soulscapes

# Function to create a file with content
create_file() {
    echo "Creating file: $1"
    cat << EOF > "$1"
$2
EOF
}

# Server setup
mkdir -p soulscapes-server/public
cd soulscapes-server

# Create server.js
create_file "server.js" "import express from 'express';
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
  console.log(\`Soulscapes Server running on port \${PORT}\`);
});"

# Create package.json for server
create_file "package.json" '{
  "name": "soulscapes-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}'

# Create a placeholder for example.png
create_file "public/example.png" "This is a placeholder for an actual image file.
In a real project, you would place an actual .png file here."

cd ..

# Client setup
mkdir -p soulscapes-client/src/pages soulscapes-client/public
cd soulscapes-client

# Create Room.js
create_file "src/pages/Room.js" "import React from 'react';
import styles from './Room.module.css';

export default function Room() {
  return (
    <div className={styles.room}>
      <h1 className={styles.header}>Room</h1>
      <p className={styles.welcome}>Welcome to Soulscapes!</p>
      <img src=\"/example.png\" alt=\"Example\" className={styles.image} />
    </div>
  );
}"

# Create Room.module.css
create_file "src/pages/Room.module.css" ".room {
  font-family: 'Arial', sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  color: #333;
  font-size: 2.5rem;
}

.welcome {
  color: #666;
  font-size: 1.2rem;
}

.image {
  max-width: 100%;
  height: auto;
  margin-top: 20px;
}"

# Create index.js
create_file "src/index.js" "import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Room from './pages/Room';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Room />
  </React.StrictMode>
);"

# Create index.css
create_file "src/index.css" "body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}"

# Create package.json for client
create_file "package.json" '{
  "name": "soulscapes-client",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "proxy": "http://localhost:4000"
}'

# Create index.html
create_file "public/index.html" '<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="Soulscapes Client Application"
    />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <title>Soulscapes</title>
    <!-- Add any additional font or icon CDN links here -->
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>'

cd ..

echo "Soulscapes project structure and files have been created."
echo "To start the server:"
echo "  cd soulscapes-server"
echo "  npm install"
echo "  npm start"
echo ""
echo "To start the client:"
echo "  cd soulscapes-client"
echo "  npm install"
echo "  npm start"
