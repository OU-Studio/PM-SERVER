const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const axios = require('axios');
const cron = require('node-cron');


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

//Slack

const slackWebhookUrl = process.env.DATA_SLACK;

function getActiveTasksGroupedByProject() {
  let tasks = [];
  let projects = [];

  try {
    tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
    projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
  } catch (err) {
    console.error('Failed to read JSON files:', err);
    return {};
  }

  const projectMap = {};
  projects.forEach(p => projectMap[p.id] = p.name);

  const grouped = {};
  tasks.forEach(task => {
    if (['todo', 'in progress'].includes(task.status)) {
      const projectName = projectMap[task.projectId] || 'Unassigned';
      if (!grouped[projectName]) grouped[projectName] = [];
      grouped[projectName].push(task);
    }
  });

  return grouped;
}

function formatSlackMessage(groupedTasks) {
  if (Object.keys(groupedTasks).length === 0) {
    return '*📝 Active Tasks:*\nNone!';
  }

  let message = '*📝 Active Tasks:*\n';

  for (const [project, tasks] of Object.entries(groupedTasks)) {
    message += `\n*${project}*:\n`;
    for (const task of tasks) {
      const due = task.dueDate ? ` (due ${task.dueDate})` : '';
      message += `• ${task.title} – _${task.status}_${due}\n`;
    }
  }

  return message;
}

const groupedTasks = getActiveTasksGroupedByProject();
const message = formatSlackMessage(groupedTasks);

try {
  await axios.post(slackWebhookUrl, { text: message });
  console.log('✅ Slack message sent');
} catch (err) {
  console.error('❌ Slack error:', err.message);
}



// Home (optional)
app.get('/', (req, res) => {
  res.send('OU Project Manager API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
