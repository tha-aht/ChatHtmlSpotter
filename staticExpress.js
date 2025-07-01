const fs = require('fs');


/*const https = require('https');


const sslOptions= {
  key: fs.readFileSync(__dirname + '/private.key'),
  cert: fs.readFileSync(__dirname + '/certificate.crt')
};
*/


/* Pakete die wir brauchen */

var bot = require('./public/js/bot.js')
var express = require('express')

var app = express()

/* Nutzen einer statischen WebSeite
*/
app.use(express.static('public')) //dadurch wird index.html angezeigt

// Wir nutzen ein paar statische Ressourcen
app.use('/css', express.static(__dirname + '/public/css'))
app.use('/js', express.static(__dirname + '/public/js'))
app.use('/images', express.static(__dirname + '/public/images'))


  // API-Endpunkt: Alle Nachrichten zurückgeben
app.get('/api/messages', function (req, res) {
  const data = fs.readFileSync('./public/js/json/chatlog.json', 'utf8')
  res.json(JSON.parse(data))
})

// API-Endpunkt: Neue Nachricht speichern (als Beispiel)
app.post('/api/messages', express.json(), function (req, res) {
  const newMessage = req.body
  let data = { users: [] }

  if (fs.existsSync('./public/js/json/chatlog.json')) {
    data = JSON.parse(fs.readFileSync('./public/js/json/chatlog.json', 'utf8'))
  }

  // Beispiel: Nachricht anhängen
  data.users.push(newMessage)
  fs.writeFileSync('./public/js/json/chatlog.json', JSON.stringify(data, null, 2))

  res.status(201).json({ message: 'Nachricht gespeichert' })
})

 // https://localhost:8181/api/messages → Zeigt alle Nachrichten (als JSON)



/*
// Beispiel: Wenn jemand /chat aufruft, soll die Datei chat.html ausgeliefert werden
app.get('/index', (req, res) => {
  res.sendFile(__dirname + '/public/index.html')
})

app.get('/index', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
*/


/*// Wir starten den Express server
var webserver = app.listen(8081, function () { //starten server ohne Verschlüsselungg
  var address = webserver.address()
  console.log(address)
  console.log('Server started at http://localhost:8081')
})*/

/*
//Oberer code wird ersetzt durch:
var webserver = https.createServer(sslOptions, app).listen(8181, 
  function() { //startet Express-Server über HTTPS indem wir Zertifikat -> sslOptions und Schlüssel -> https.createServer(...) übergeben
  var address = webserver.address()
  console.log(address)
  console.log('Server started at https://localhost:8181')
  });
*/

//Neu: wegen Render, der gibt Port zum Verbinden
const PORT = process.env.PORT || 10000;

const webserver = app.listen(PORT, '0.0.0.0', () => { //server speichern und ihn an websocket weitergeben,0.0.0.0 auf alle interfaces
  console.log(`Server läuft auf Port ${PORT}`);
});


var WSS = require('websocket').server;

var wss = new WSS({
  httpServer: webserver,
  autoAcceptConnections: false
});



/*// Das brauchen wir für unsere Websockets
var WSS = require('websocket').server
var http = require('http')

var server = http.createServer()
server.listen(8181)
*/

/*// Hier erstellen wir den Server
var wss = new WSS({
  httpServer: server,
  autoAcceptConnections: false
})*/

/*
//Oberen beide Codes werden ersetzt durch:
var WSS = require('websocket').server

//Websocket-Server an den bestehenden HTTPS-Server binden
var wss = new WSS({
  httpServer: webserver,
  autoAcceptConnections: false
});
// Dadurch laufen staticExpress und Websocket auf Port 8081 und über HTTPS.
*/


/* Wir erstellen einen Bot, der kann sich aber noch nicht mit 
    dem Socket Server verbinden, da dieser noch nicht läuft
*/
var myBot = new bot()
var connections = {}

// Wenn Sich ein client Socket mit dem Server verbinden will kommt er hier an
wss.on('request', function (request) {
  var connection = request.accept('chat', request.origin)

  connection.on('message', function (message) {
    var name = ''

    for (var key in connections) {
      if (connection === connections[key]) {
        name = key
      }
    }

    var data = JSON.parse(message.utf8Data)
    var msg = 'leer'

    // Variablen um später den letzten Satz und den Sender zu speichern
    var uname
    var utype
    var umsg

    switch (data.type) {
      case 'join':
        // Wenn der Typ join ist füge ich den Client einfach unserer Liste hinzu
        connections[data.name] = connection
        msg = '{"type": "join", "names": ["' + Object.keys(connections).join('","') + '"]}'
        if (myBot.connected === false) {
          myBot.connect()
        }

        break
      case 'msg':
        // Erstelle eine Nachricht in JSON mit Typ, Sender und Inhalt
        msg = '{"type": "msg", "name":"' + name + '", "msg":"' + data.msg + '","sender":"'+data.sender+'"}'
        utype = 'msg'
        uname = name
        umsg = data.msg
        break
    }

    //Sende Daten an alle verbundenen Sockets
    for (var key in connections) {
      if (connections[key] && connections[key].send) {
        connections[key].send(msg)
      }
    }
    
    /*
    // Leite die Daten des Users an den Bot weiter, damit der antworten kann
    if (uname !== 'Jeff' && utype === 'msg') {
      myBot.post(msg)
    }*/

    if (uname !== 'Jeff' && utype === 'msg' && myBot.connected && myBot.con) {
      myBot.post(msg);
    }

  });

  connection.on('error', function (error) {
    console.error('WebSocket connection error:', error);
  });

  connection.on('close', function(reasonCode, description) {
    console.log('WebSocket connection closed:', reasonCode, description);
  });

  
});

