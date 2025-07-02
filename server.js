const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const axios = require('axios');
const cron = require('node-cron');

const { initSSE } = require('./events');


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

initSSE(app);


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
    if (['todo', 'in-progress'].includes(task.status)) {
      const projectName = projectMap[task.projectId] || 'Unassigned';
      if (!grouped[projectName]) grouped[projectName] = [];
      grouped[projectName].push(task);
    }
  });

  return grouped;
}

function formatSlackMessage(groupedTasks) {
  const now = new Date();
const timeStr = new Intl.DateTimeFormat('en-UK', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Europe/London'
}).format(now).toLowerCase();
  const weekday = now.toLocaleDateString('en-UK', { weekday: 'long' });
  const day = now.getDate();
  const month = now.toLocaleString('en-UK', { month: 'long' });
  const suffix = (d => (d > 3 && d < 21) ? 'th' : ['st','nd','rd'][d % 10 - 1] || 'th')(day);
  const header = `${timeStr}, ${weekday} ${day}${suffix} ${month}`;

  if (Object.keys(groupedTasks).length === 0) {
    return `*${header}*\n_Current tasks are:_\nNone! 🎉`;
  }

  let message = `*${header}*\n_Current tasks are:_\n`;

  const today = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;

  for (const [project, tasks] of Object.entries(groupedTasks)) {
    message += `\n*${project}*:\n`;
    for (const task of tasks) {
      let dueLabel = '';
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
        const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        const diffDays = Math.floor((utcDate - utcToday) / msPerDay);

        if (diffDays >= 0 && diffDays <= 6) {
          dueLabel = ` (due ${date.toLocaleDateString('en-UK', { weekday: 'long' })})`;
        } else {
          const d = date.getDate();
          const suf = (d > 3 && d < 21) ? 'th' : ['st','nd','rd'][d % 10 - 1] || 'th';
          const m = date.toLocaleString('en-UK', { month: 'long' });
          dueLabel = ` (due ${d}${suf} ${m})`;
        }
      }
      message += `• ${task.title} – _${task.status}_${dueLabel}\n`;
    }
  }

  return message;
}


const groupedTasks = getActiveTasksGroupedByProject();
const message = formatSlackMessage(groupedTasks);

// 🕘 Daily Slack update at 9am UK time
cron.schedule('0 9 * * *', async () => {
  const groupedTasks = getActiveTasksGroupedByProject();
  const message = formatSlackMessage(groupedTasks);

  if (!slackWebhookUrl) {
    console.warn('⚠️ No Slack webhook configured.');
    return;
  }

  try {
    await axios.post(slackWebhookUrl, { text: message });
    console.log('✅ 9am task summary sent to Slack');
  } catch (err) {
    console.error('❌ Failed to send Slack update:', err.message);
  }
}, {
  timezone: 'Europe/London'
});

// 🕘 Daily Slack update at 9am UK time
cron.schedule('0 15 * * *', async () => {
  const groupedTasks = getActiveTasksGroupedByProject();
  const message = formatSlackMessage(groupedTasks);

  if (!slackWebhookUrl) {
    console.warn('⚠️ No Slack webhook configured.');
    return;
  }

  try {
    await axios.post(slackWebhookUrl, { text: message });
    console.log('✅ 9am task summary sent to Slack');
  } catch (err) {
    console.error('❌ Failed to send Slack update:', err.message);
  }
}, {
  timezone: 'Europe/London'
});


axios.post(slackWebhookUrl, {
  text: message
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
