const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const initializeServer = () => {
    const app = express();
    const server = http.createServer(app);
    const io = socketIO(server);

    app.use(express.static(path.join(__dirname, 'public')));

    let globalCountdown = 60;
    let globalIncrementCount = 0;
    let globalLastResetTimestamp = null;
    let lastUpdateTimestamp = Date.now();

    const socketCountdowns = new Map();

    io.on('connection', (socket) => {
        console.log('A user connected');

        const room = socket.id;
        socket.join(room);

        const timeElapsed = Date.now() - lastUpdateTimestamp;
        const initialCountdown = Math.max(0, globalCountdown - Math.floor(timeElapsed / 1000));

        socket.emit('countdown', initialCountdown);
        socket.emit('lastReset', { timestamp: globalLastResetTimestamp, count: globalIncrementCount });

        if (socketCountdowns.has(room)) {
            const { countdown, incrementCount, lastResetTimestamp } = socketCountdowns.get(room);
            socket.emit('countdown', countdown);
            socket.emit('lastReset', { timestamp: lastResetTimestamp, count: incrementCount });
        }

        let countdownInitialized = false;
        let previousCountdown = globalCountdown;

        const countdownInterval = setInterval(() => {
            if (!countdownInitialized) {
                io.to(room).emit('countdown', globalCountdown);
                countdownInitialized = true;
            } else {
                if (previousCountdown !== globalCountdown) {
                    io.emit('countdown', globalCountdown);
                    previousCountdown = globalCountdown;
                }
            }

            globalCountdown--;

            if (globalCountdown < 0) {
                globalCountdown = 60;
                lastUpdateTimestamp = Date.now();
            }
        }, 1000);

        socket.on('disconnect', () => {
            console.log('User disconnected');
            clearInterval(countdownInterval);
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log(`User reconnected after ${attemptNumber} attempts`);
        });

        socket.on('incrementAndReset', () => {
            globalLastResetTimestamp = Date.now();
            globalIncrementCount++;
            globalCountdown = 60;
            lastUpdateTimestamp = Date.now();

            socketCountdowns.set(room, {
                countdown: globalCountdown,
                incrementCount: globalIncrementCount,
                lastResetTimestamp: globalLastResetTimestamp,
            });

            if (previousCountdown !== globalCountdown) {
                io.emit('countdown', globalCountdown);
                io.emit('lastReset', { timestamp: globalLastResetTimestamp, count: globalIncrementCount });
                previousCountdown = globalCountdown;
            }
        });
    });

    server.on('error', (error) => {
        console.error('Server error:', error);
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

initializeServer();
