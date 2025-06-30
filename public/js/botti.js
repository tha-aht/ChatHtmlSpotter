const answers = new Array(40);
let i = 0;
const socket = new WebSocket('wss://minecraft-chatbot.onrender.com', 'chat');


//Um herauszufinden, ob sich der Websocket verbindet oder nicht
socket.onopen = function () {
  console.log('WebSocket connected');
  name = "Spieler" + Math.floor(Math.random()*100);
  socket.send(JSON.stringify({ type: "join", name: name }));
};

socket.onerror = function (error) {
  console.error('WebSocket error:', error);
};

socket.onclose = function (event) {
  console.log('WebSocket closed:', event);
};



let name = 'u1';

socket.onopen = function () {
  name = "Spieler" + Math.floor(Math.random()*100);
  socket.send(JSON.stringify({ type: "join", name: name }));
};

$('#sendBtn').on('click', function (e) {
  e.preventDefault();
  const msg = $('#msg').val();
  if (msg.trim() !== "") {
    socket.send(JSON.stringify({ type: "msg", msg: msg, sender: name }));
    $('#msg').val('');
  }
});

// ENTER zum Senden aktivieren
$('#msg').on('keypress', function (e) {
  if (e.which === 13 && !e.shiftKey) {
    e.preventDefault();
    $('#sendBtn').click();
  }
});

socket.onmessage = function (msg) {
  const data = JSON.parse(msg.data);
  switch (data.type) {
    case 'msg':
      if (data.name === name || (data.name === "Jeff" && (data.sender === name || data.sender === "Jeff"))) {
        const messageClass = data.name === "Jeff" ? "bot" : "you";
        const message = $('<div class="chat-message ' + messageClass + '">' + data.name + ': ' + data.msg + '</div>');
        $('#msgs').append(message);
        $('#msgs').scrollTop($('#msgs')[0].scrollHeight);
        answers[i] = data.msg;
        i++;
      }
      break;

    case 'join':
      $('#users').empty();
      $('#users').append('<div>Spieler online:</div>');
      for (let j = 0; j < data.names.length; j++) {
        $('#users').append('<div>' + data.names[j] + '</div>');
      }
      break;
  }
};
