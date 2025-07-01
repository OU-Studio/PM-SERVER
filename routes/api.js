const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const projectsFile = path.join(dataDir, 'projects.json');
const tasksFile = path.join(dataDir, 'tasks.json');

const { broadcastUpdate } = require('../events');


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

// GET all projects
router.get('/projects', (req, res) => {
  const projects = readJson(projectsFile);
  res.json(projects);
});

// GET all tasks or tasks by projectId
router.get('/tasks', (req, res) => {
  const tasks = readJson(tasksFile);
  const { projectId } = req.query;
  const filtered = projectId ? tasks.filter(t => t.projectId === projectId) : tasks;
  res.json(filtered);
});

// POST a new task
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
  broadcastUpdate('task-changed', { action: 'add', task: newTask });
  res.status(201).json(newTask);
});

// PUT update task
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
  broadcastUpdate('task-changed', { action: 'update', task: updatedTask });
  res.json(updatedTask);
});

// DELETE task
router.delete('/tasks/:id', (req, res) => {
  const tasks = readJson(tasksFile);
  const taskId = req.params.id;
  const index = tasks.findIndex(t => t.id === taskId);

  if (index === -1) return res.status(404).json({ error: 'Task not found' });

  const deletedTask = tasks[index];
  tasks.splice(index, 1);
  writeJson(tasksFile, tasks);
  broadcastUpdate('task-changed', { action: 'delete', task: deletedTask });
  res.json({ success: true });
});

// POST new project
router.post('/projects', (req, res) => {
  const projects = readJson(projectsFile);
  const newProject = {
    id: 'proj-' + Date.now(),
    name: req.body.name || 'Untitled Project',
  };
  projects.push(newProject);
  writeJson(projectsFile, projects);
  res.status(201).json(newProject);
});

// DELETE project (and its tasks)
router.delete('/projects/:id', (req, res) => {
  const id = req.params.id;
  let projects = readJson(projectsFile);
  let tasks = readJson(tasksFile);

  projects = projects.filter(p => p.id !== id);
  tasks = tasks.filter(t => t.projectId !== id);

  writeJson(projectsFile, projects);
  writeJson(tasksFile, tasks);
  res.json({ success: true });
});

// Chat endpoint
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    res.json({ reply });
  } catch (err) {
    console.error('ChatGPT error:', err.message);
    res.status(500).json({ error: 'Failed to fetch from OpenAI' });
  }
});

module.exports = router;
