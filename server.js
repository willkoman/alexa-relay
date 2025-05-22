const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const devices = new Map();         // device_id → registration time or IP
const pendingCommands = new Map(); // device_id → command

// Device registration
app.post('/register', (req, res) => {
    const { device_id } = req.body;
    if (!device_id) return res.status(400).send('Missing device_id');
    devices.set(device_id, Date.now());
    res.send('Device registered');
});

// Alexa queues a command
app.post('/command', (req, res) => {
    const { device_id, command } = req.body;
    if (!devices.has(device_id)) return res.status(404).send('Device not found');
    pendingCommands.set(device_id, command);
    res.send('Command queued');
});

// Device polls for command
app.get('/pending-command', (req, res) => {
    const { device_id } = req.query;
    if (!device_id || !devices.has(device_id)) return res.status(404).send('Device not found');
    const command = pendingCommands.get(device_id);
    if (command) {
        pendingCommands.delete(device_id);
        return res.send(command);
    }
    res.send(''); // No command
});

// Health check
app.get('/', (req, res) => res.send('Relay is running'));

app.listen(port, () => {
    console.log(`Relay listening on port ${port}`);
});
