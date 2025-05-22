// server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const devices = new Map(); // device_id -> local_ip

// Register device
app.post('/register', (req, res) => {
    const { device_id, local_ip } = req.body;
    if (!device_id || !local_ip) {
        return res.status(400).send('Missing device_id or local_ip');
    }

    devices.set(device_id, local_ip);
    console.log(`Registered ${device_id} -> ${local_ip}`);
    res.send('Registered');
});

// Command to device
app.post('/command', async (req, res) => {
    const { device_id, command } = req.body;
    const local_ip = devices.get(device_id);
    if (!local_ip) return res.status(404).send('Device not found');

    try {
        const deviceUrl = `http://${local_ip}/cmd?a=${encodeURIComponent(command)}`;
        const response = await fetch(deviceUrl);
        const result = await response.text();
        res.send(`Command sent. Device responded with: ${result}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to contact device');
    }
});

app.get('/', (req, res) => res.send('Relay server running'));

app.listen(port, () => {
    console.log(`Relay server listening on port ${port}`);
});
