const express = require('express');
const  http = require('http');
const socketio = require('socket.io');


const app = express();
const port = 3100;
const server = http.createServer(app);
const  io = socketio(server);

app.get('/',(req,res)=>{
    res.sendFile(__dirname + '/index.html');
});

io.on('connection',(socket)=>{
console.log('A user connected' , socket.id);
socket.on('chat',(msg)=>{
    console.log('msg is', msg);
    io.emit('chat',msg)
});
socket.on('disconnect', () => {
    console.log('A user disconnected', socket.id);
  });
})
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});