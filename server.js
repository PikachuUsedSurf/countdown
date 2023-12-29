const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(__dirname + '/public'));

let globalCountdown = 60;
let globalIncrementCount = 0;
let globalLastResetTimestamp = null;

io.on('connection', (socket) => {
    console.log('A user connected');

    // Join a room based on the user's ID (socket ID)
    const room = socket.id;
    socket.join(room);

    // Emit global countdown values
    const countdownInterval = setInterval(() => {
        io.emit('countdown', globalCountdown);
        globalCountdown--;

        if (globalCountdown < 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    socket.on('incrementAndReset', () => {
        // Reset global countdown, update global last reset timestamp, and increment global count
        globalCountdown = 60;
        globalLastResetTimestamp = Date.now();
        globalIncrementCount++;

        // Emit updated values to all connected users
        io.emit('lastReset', { timestamp: globalLastResetTimestamp, count: globalIncrementCount });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
