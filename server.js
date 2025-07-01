const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const axios = require('axios');


const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Full CORS setup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // or restrict to your Squarespace domains
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Optional: respond to preflight requests
app.options('*', (req, res) => {
  res.sendStatus(200);
});

app.use(express.json());

app.use('/api', require('./routes/api'))


const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const projectsFile = path.join(dataDir, 'projects.json');
const tasksFile = path.join(dataDir, 'tasks.json');

// 🔧 Auto-create files if missing
if (!fs.existsSync(projectsFile)) {
  console.warn('⚠️ projects.json not found, creating empty file');
  fs.writeFileSync(projectsFile, '[]');
}

if (!fs.existsSync(tasksFile)) {
  console.warn('⚠️ tasks.json not found, creating empty file');
  fs.writeFileSync(tasksFile, '[]');
}


// Read JSON utility
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
}

// Write JSON utility
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const slackWebhookUrl = 'https://hooks.slack.com/services/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';

axios.post(slackWebhookUrl, {
  text: '*Test Message:* Hello from your PM server 👋'
}).then(() => {
  console.log('✅ Message sent to Slack!');
}).catch(err => {
  console.error('❌ Slack message failed:', err.message);
});



// Home (optional)
app.get('/', (req, res) => {
  res.send('OU Project Manager API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
