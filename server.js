const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory maps
const devices = new Map();          // device_id → registration time
const pendingCommands = new Map();  // device_id → command
let userBindings = {};              // user_id → device_id

const BINDINGS_FILE = './user_bindings.json';

// Load user bindings from disk if available
if (fs.existsSync(BINDINGS_FILE)) {
  try {
    userBindings = JSON.parse(fs.readFileSync(BINDINGS_FILE, 'utf8'));
    console.log(`Loaded user bindings from ${BINDINGS_FILE}`);
  } catch (err) {
    console.error('Failed to load user bindings:', err);
  }
}

// Persist bindings to disk
function saveBindings() {
  fs.writeFileSync(BINDINGS_FILE, JSON.stringify(userBindings, null, 2));
}

// ========== Endpoints ==========

// 1. Device registers itself
app.post('/register', (req, res) => {
  const { device_id } = req.body;
  if (!device_id) return res.status(400).send('Missing device_id');
  devices.set(device_id, Date.now());
  console.log(`Registered device: ${device_id}`);
  res.send('Device registered');
});

// 2. Alexa binds user to a device serial
app.post('/bind-user', (req, res) => {
  const { user_id, device_id } = req.body;
  if (!user_id || !device_id) return res.status(400).send('Missing user_id or device_id');
  if (!devices.has(device_id)) return res.status(404).send('Device not registered');

  userBindings[user_id] = device_id;
  saveBindings();
  console.log(`Bound user ${user_id} to device ${device_id}`);
  res.send('User bound to device');
});

// 3. Alexa skill requests device_id for a user
app.get('/resolve-device', (req, res) => {
  const { user_id } = req.query;
  const device_id = userBindings[user_id];
  if (!device_id) return res.status(404).send('No device linked');
  res.json({ device_id });
});

// 4. Alexa queues command for user's device
app.post('/command', (req, res) => {
  const { device_id, command } = req.body;
  if (!devices.has(device_id)) return res.status(404).send('Device not registered');
  pendingCommands.set(device_id, command);
  console.log(`Queued command for ${device_id}: ${command}`);
  res.send('Command queued');
});

// 5. Device polls for pending commands
app.get('/pending-command', (req, res) => {
  const { device_id } = req.query;
  if (!device_id || !devices.has(device_id)) return res.status(404).send('Device not found');

  const command = pendingCommands.get(device_id);
  if (command) {
    pendingCommands.delete(device_id);
    console.log(`Delivered command to ${device_id}: ${command}`);
    return res.send(command);
  }

  res.send('');
});

// 6. Health check
app.get('/', (req, res) => res.send('Relay server running'));

app.listen(port, () => {
  console.log(`Relay server listening on port ${port}`);
});
