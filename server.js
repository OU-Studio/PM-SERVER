// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
const projectsFile = path.join(dataDir, 'projects.json');
const tasksFile = path.join(dataDir, 'tasks.json');

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

// Routes
app.get('/api/projects', (req, res) => {
  const projects = readJson(projectsFile);
  res.json(projects);
});

app.get('/api/tasks', (req, res) => {
  const tasks = readJson(tasksFile);
  const { projectId } = req.query;
  const filtered = projectId ? tasks.filter(t => t.projectId === projectId) : tasks;
  res.json(filtered);
});

// Home (optional)
app.get('/', (req, res) => {
  res.send('OU Project Manager API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
