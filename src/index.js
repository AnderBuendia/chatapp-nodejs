const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
/* Filter to bad words when you execute a callback */ 
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
app.use(express.json());

/* set up socket.io */
const io = socketio(server); 

/* Port & Paths */
const port = process.env.PORT || 5000;
const publicDirectoryPath = path.join(__dirname, '../public');

/* Setup static directory to serve */
app.use(express.static(publicDirectoryPath));


/* server (emit) => client (receive) - countUpdated
*  client (emit) => server (receive) - increment */
// let count = 0;

io.on('connection', socket => {
    console.log('New web socket connection')

    // socket.emit('countUpdated', count)
    // socket.on('increment', () => {
    //     count++;
    //     // socket.emit('countUpdated', count);
    //     io.emit('countUpdated', count);
    // })

    /** SOCKET socket.emit, io.emit, socket.broadcast.emit
    * JOIN io.to.emit, socket.broadcast.to.emit */
    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })
        
        if (error) {
            /* Use return to stop the function execution */
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));        
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);

        const filter = new Filter();

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
    
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps/@${coords.latitude},${coords.longitude}`))
        callback();
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left the room!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log('Server is up on port', port);
})