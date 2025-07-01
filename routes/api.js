// routes/api.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const projectsFile = path.join(dataDir, 'projects.json');
const tasksFile = path.join(dataDir, 'tasks.json');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

router.get('/projects', (req, res) => {
  const projects = readJson(projectsFile);
  res.json(projects);
});

router.get('/tasks', (req, res) => {
  const tasks = readJson(tasksFile);
  const { projectId } = req.query;
  const filtered = projectId ? tasks.filter(t => t.projectId === projectId) : tasks;
  res.json(filtered);
});

router.post('/tasks', (req, res) => {
  const tasks = readJson(tasksFile);
  const newTask = {
    id: 'task-' + Date.now(),
    title: req.body.title,
    status: req.body.status || 'todo',
    assignee: req.body.assignee || '',
    dueDate: req.body.dueDate || '',
    updatedAt: new Date().toISOString(),
    projectId: req.body.projectId || null,
    notes: req.body.notes || ''
  };
  tasks.push(newTask);
  writeJson(tasksFile, tasks);
  res.status(201).json(newTask);
});

router.put('/tasks/:id', (req, res) => {
  const tasks = readJson(tasksFile);
  const taskIndex = tasks.findIndex(t => t.id === req.params.id);
  if (taskIndex === -1) return res.status(404).json({ error: 'Task not found' });

  const updatedTask = {
    ...tasks[taskIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  tasks[taskIndex] = updatedTask;
  writeJson(tasksFile, tasks);
  res.json(updatedTask);
});

router.delete('/tasks/:id', (req, res) => {
  const tasks = readJson(tasksFile);
  const taskId = req.params.id;
  const index = tasks.findIndex(t => t.id === taskId);

  if (index === -1) return res.status(404).json({ error: 'Task not found' });

  tasks.splice(index, 1); // Remove task
  writeJson(tasksFile, tasks);
  res.json({ success: true });
});




module.exports = router;
