'use strict'
const fs = require('fs');
const LOGFILE = "./public/js/json/chatlog.json";


var WebSocketClient = require('websocket').client


/**
 * bot ist ein einfacher Websocket Chat Client
 */

class bot {

  /**
   * Konstruktor baut den client auf. Er erstellt einen Websocket und verbindet sich zum Server
   * Bitte beachten Sie, dass die Server IP hardcodiert ist. Sie müssen sie umsetzten
   */
  constructor () {
    
    
    
    this.chatBot = require("./json/minecraft.json")
    this.hello = require("./json/hello.json")
    this.needHelp = require("./json/needHelp.json")
    this.no = require("./json/no.json")
    this.yes = require("./json/yes.json")
    this.dAnswer = require("./json/defaultAnswer.json")
    this.understood = require("./json/understood.json")
    this.sender=""
    

   
    //Die Websocketverbindung
    this.client = new WebSocketClient()
    
    //Wenn der Websocket verbunden ist, dann setzten wir ihn auf true
    this.connected = false

    
    //Wenn die Verbindung nicht zustande kommt, dann läuft der Aufruf hier hinein
    this.client.on('connectFailed', (error) => {
      console.log('Connect Error: ' + error.toString())
    })

     
      //Wenn der Client sich mit dem Server verbindet sind wir hier 
      this.client.on('connect', (connection) => {
      this.con = connection
      this.connected = true;
      console.log('WebSocket Client Connected')


      connection.on('error', (error) => {
      console.log('Connection Error: ' + error.toString())
      })

      //Es kann immer sein, dass sich der Client disconnected (typischer Weise, wenn der Server nicht mehr da ist)
      connection.on('close', () => {
      console.log('echo-protocol Connection Closed')
      this.connected = false;
    })

      
      //Hier ist der Kern, wenn immmer eine Nachricht empfangen wird, kommt hier die Nachricht an. 
      connection.on('message', (message) => {
        if (message.type === 'utf8') {
          var data = JSON.parse(message.utf8Data)
          console.log('Received: ' + data.msg + ' ' + data.name)
        }
      })
       
      //Hier senden wir unsere Kennung damit der Server uns erkennt.
      //Wir formatieren die Kennung als JSON
      function joinGesp () {
        if (connection.connected) {
          connection.sendUTF('{"type": "join", "name":"Jeff"}')
          const logfile = require("./json/hello.json")
          var inhalt = logfile[Math.floor(Math.random()*logfile.length)]
          var msg = '{"type": "msg", "name": "' + "Jeff" + '", "msg":"' + inhalt + '","sender":"Jeff" }'
          console.log('Send: ' + msg)
          connection.sendUTF(msg)
        }
      }
      
      joinGesp()
    })
  }

   //Methode um sich mit dem Server zu verbinden. Achtung wir nutzen localhost
  connect () {
    this.client.connect('ws://localhost:8181/', 'chat', null, null, {
    //this.connected = true 
    rejectUnauthorized: false  // Wichtig für self-signed cert
  });

  }

  /** 
   * Hier muss ihre Verarbeitungslogik integriert werden.
   * Diese Funktion wird automatisch im Server aufgerufen, wenn etwas ankommt, das wir 
   * nicht geschrieben haben
   * @param nachricht auf die der bot reagieren soll
  */
  post (msg) {
    var get=JSON.parse(msg);
    var nachricht = get.msg.toLowerCase();
    var name = 'Jeff'
    this.botName = name
    var inhalt = ''
    this.sender=get.name;
    var defaultAnswer = this.randomIndex(this.dAnswer)  //the default Answer
    var understood = this.randomIndex(this.understood)

    //Chat History speichern
    this.saveChatMessageUser(this.sender, nachricht)

    //Prüft ob der User im aktuellen Intent fortfahren will
    if (this.readQuestion(this.sender) != "" && this.dontContinue(nachricht)){
      var questionAsked = true;
      this.saveQuestion("", this.sender)
      this.saveIntent([], this.sender)
      this.saveSelection("", this.sender)
      inhalt = understood + " "
    }

    //Überprüft, ob es schon einen Intent vorher gab, der erweitert wird
    if (this.readIntent(this.sender).length != 0){
      inhalt = this.runThroughList(this.readIntent(this.sender), nachricht, defaultAnswer)
      if (inhalt == defaultAnswer){
        inhalt += " " +  this.randomIndex(this.readQuestion(this.sender)) + " " + this.randomIndex(this.readSelection(this.sender))
        this.changeFallBackCounter(this.sender, false)
      }
    } else {
      //Geht durch die ganze JSON Datei
      inhalt += this.runThroughList(this.chatBot.answers, nachricht, defaultAnswer)
    }

    if (questionAsked && inhalt == understood + " " + defaultAnswer){
      inhalt = understood + " " + this.randomIndex(this.needHelp)
      this.changeFallBackCounter(this.sender, false)
    }

    //Hard Fallback -> Setzt alles auf Anfang
    if (inhalt == defaultAnswer){
      this.changeFallBackCounter(this.sender, false)
    }
    if (this.readFallBackCounter(this.sender) == 3){
      inhalt = "Da ich dich nun mehrfach nicht verstanden habe fangen wir nun von vorne an. " + this.randomIndex(this.needHelp)
      this.saveIntent([], this.sender)
      this.saveQuestion("", this.sender)
      this.changeFallBackCounter(this.sender, true)
      this.saveSelection(this.sender, "")
    }

    this.saveChatMessageBot(this.sender, inhalt)

    //Verarbeitung
    var msg = '{"type": "msg", "name":"' + name + '", "msg":"' + inhalt + '","sender":"'+this.sender+'"}'
    console.log('Send: ' + msg)
    
    //Damit der Bot nicht zusammenbicht, wenn der Bot nocht nicht verbunden ist.
    if (!this.con || !this.connected) {
      console.log("Bot ist noch nicht verbunden. Nachricht wird verworfen.");
      return;
    }

    this.con.sendUTF(msg)
    
  }

  //Durchläuft eine Liste
  runThroughList (list, nachricht, defaultAnswer) {
  var inhalt = defaultAnswer
  for (var i = 0; i < list.length; i++) {
    for (var j = 0; j < list[i].intent.length; j++) {
      //Wenn die Nachricht den Intent beinhält schaut er ob es noch eine Unterliste gibt
      if (nachricht.includes(list[i].intent[j])) { 
        if (list[i].list) {
          //ruft sich rekursiv auf mit der Unterliste
          this.saveIntent(list[i].list, this.sender)
          this.saveQuestion(list[i].question, this.sender)
          this.saveSelection(this.randomIndex(list[i].selection), this.sender)
          inhalt = this.runThroughList(list[i].list, nachricht, defaultAnswer) 
        } else {
          this.saveIntent([], this.sender)
          this.saveQuestion("", this.sender)
        }
        //Wenn keine weitere Antwort gefunden wurde gibt er passende aus
        if (inhalt == defaultAnswer){
          inhalt = this.randomIndex(list[i].answer)
          }  
        this.changeFallBackCounter(this.sender, true)
        return inhalt
      }
    }
  }
  return inhalt
}


  //Überprüft ob Eingabe ein Array ist.
  //Wenn ja, gibt einen random Index aus.
  randomIndex(array){
    if (Array.isArray(array)){
      return array[Math.floor(Math.random()*array.length)]
    } else {
      return array;
    }
  }

  //Checkts if the User dont wants to continue the action
  dontContinue(nachricht){
    for (var i = 0; i < this.no.length; i++){
      if (nachricht.includes(this.no[i])){
        return true
      }
    }
    return false
  }

  //Checkts if the User wants to continue the action
  continue(nachricht){
    for (var i = 0; i < this.yes.length; i++){
      if (nachricht.includes(this.yes[i])){
        return true
      }
    }
    return false
  }

  //Speichert den Sender und die Nachricht als Eintrag in der json Datei
  saveChatMessageUser(sender, nachricht) {
    //Datei laden oder initialisieren
    let data = { users: [] };
    if (fs.existsSync(LOGFILE)) {
      data = JSON.parse(fs.readFileSync(LOGFILE, 'utf8'));
    }

    //User suchen
    let user = data.users.find(u => u.username === sender);
    if (!user) {
      // 3a. falls nicht gefunden: neu anlegen
      user = {
        username: sender,
        currentIntent: [],
        currentQuestion: "",
        currentSelection: "",
        fallBackCounter: 0,
        chathistory: []
      };
      data.users.push(user);
    }

    //Nachricht ans chathistory-Array anhängen
    user.chathistory.push({
      sender: sender,
      message: nachricht,
      timestamp: new Date().toISOString()
    });

    // 4. Alles wieder zurückschreiben
    fs.writeFileSync(LOGFILE, JSON.stringify(data, null, 2), 'utf8');
  }

  saveChatMessageBot(sender, nachricht) {
    //Datei laden oder initialisieren
    let data = { users: [] };
    if (fs.existsSync(LOGFILE)) {
      data = JSON.parse(fs.readFileSync(LOGFILE, 'utf8'));
    }

    //User suchen
    let user = data.users.find(u => u.username === sender);
    if (!user) {
      // 3a. falls nicht gefunden: neu anlegen
      user = {
        username: sender,
        currentIntent: [],
        currentQuestion: "",
        currentSelection: "",
        fallBackCounter: 0,
        chathistory: []
      };
      data.users.push(user);
    }

    //Nachricht ans chathistory-Array anhängen
    user.chathistory.push({
      sender: this.botName,
      message: nachricht,
      timestamp: new Date().toISOString()
    });

    // 4. Alles wieder zurückschreiben
    fs.writeFileSync(LOGFILE, JSON.stringify(data, null, 2), 'utf8');
  }

  saveIntent(currentIntent, sender){
    //Datei laden oder initialisieren
    let data = { users: [] };
    if (fs.existsSync(LOGFILE)) {
      data = JSON.parse(fs.readFileSync(LOGFILE, 'utf8'));
    }

    //User suchen
    let user = data.users.find(u => u.username === sender);

    user.currentIntent = currentIntent

    // 4. Alles wieder zurückschreiben
    fs.writeFileSync(LOGFILE, JSON.stringify(data, null, 2), 'utf8');
  }

  readIntent(sender){
    //Datei laden oder initialisieren
    let data = { users: [] };
    if (fs.existsSync(LOGFILE)) {
      data = JSON.parse(fs.readFileSync(LOGFILE, 'utf8'));
    }

    //User suchen
    let user = data.users.find(u => u.username === sender);

    return user.currentIntent
  }

  saveQuestion(currentQuestion, sender){
    //Datei laden oder initialisieren
    let data = { users: [] };
    if (fs.existsSync(LOGFILE)) {
      data = JSON.parse(fs.readFileSync(LOGFILE, 'utf8'));
    }

    //User suchen
    let user = data.users.find(u => u.username === sender);

    user.currentQuestion = currentQuestion

    // 4. Alles wieder zurückschreiben
    fs.writeFileSync(LOGFILE, JSON.stringify(data, null, 2), 'utf8');
  }

  readQuestion(sender){
    //Datei laden oder initialisieren
    let data = { users: [] };
    if (fs.existsSync(LOGFILE)) {
      data = JSON.parse(fs.readFileSync(LOGFILE, 'utf8'));
    }

    //User suchen
    let user = data.users.find(u => u.username === sender);

    return user.currentQuestion
  }

  saveSelection(currentSelection, sender){
    //Datei laden oder initialisieren
    let data = { users: [] };
    if (fs.existsSync(LOGFILE)) {
      data = JSON.parse(fs.readFileSync(LOGFILE, 'utf8'));
    }

    //User suchen
    let user = data.users.find(u => u.username === sender);

    if(!user) {
      user = { username: sender };
      date.users.push(user);
    }
    
    user.currentSelection = currentSelection

    // 4. Alles wieder zurückschreiben
    fs.writeFileSync(LOGFILE, JSON.stringify(data, null, 2), 'utf8');
  }

  readSelection(sender){
    //Datei laden oder initialisieren
    let data = { users: [] };
    if (fs.existsSync(LOGFILE)) {
      data = JSON.parse(fs.readFileSync(LOGFILE, 'utf8'));
    }

    //User suchen
    let user = data.users.find(u => u.username === sender);

    return user.currentSelection
  }

  changeFallBackCounter(sender, reset){
    //Datei laden oder initialisieren
    let data = { users: [] };
    if (fs.existsSync(LOGFILE)) {
      data = JSON.parse(fs.readFileSync(LOGFILE, 'utf8'));
    }

    //User suchen
    let user = data.users.find(u => u.username === sender);

    if (reset == false){
      user.fallBackCounter++
    } else {
      user.fallBackCounter = 0
    }
    
    // 4. Alles wieder zurückschreiben
    fs.writeFileSync(LOGFILE, JSON.stringify(data, null, 2), 'utf8');
  }

  readFallBackCounter(sender){
    //Datei laden oder initialisieren
    let data = { users: [] };
    if (fs.existsSync(LOGFILE)) {
      data = JSON.parse(fs.readFileSync(LOGFILE, 'utf8'));
    }

    //User suchen
    let user = data.users.find(u => u.username === sender);

    return user.fallBackCounter
  }
}



module.exports = bot