//-------------Init
var express   = require('express')
  , app       = express()
  , server    = require('http').createServer(app)
  , io        = require('socket.io').listen(server);
var path = require('path');
var port = process.env.port || 80;
var passport = require('passport');
var util = require('util');
var FacebookStrategy = require('passport-facebook').Strategy;
var fs = require('fs');
var util = require('util');
var ch =  require('./chess');
var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var OpenGraph = require('facebook-open-graph');
var openGraph = new OpenGraph('fb_app_namespace');
var userList = [];
var availableGames = [];
var gameList = [];
var chessList = [];
var gameCount = 0;
server.listen(port);

//---------------Config App
app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.session({ secret: 'keyboard cat' }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
    app.use(express.methodOverride());
    app.use(express.logger());
});

var db = mongoose.connect('mongodb://localhost/dataBase');

//--------------Db Shemas config
var userShema = mongoose.Schema({
    id : { type: Number, index: true, unique: true, required: true },
    name : String,
    age : String,
    isAuthorized : Boolean,
    battlesCount : Number,
    winInBattlesCount : Number,
    isInGame : Boolean
});

var gameShema = mongoose.Schema({
    id : { type: String, index: true, unique: true, required: true },
    userList : [{id : Number}],
    history : [{source : String, piece : String, target : String, timestamp : String, stepDuration : String}],
    status : String
});

userShema.methods.findById = function(cb) {
    return this.model('user').find({ id: this.id }, cb);
};

var User = mongoose.model('user', userShema);
var Game = mongoose.model('game', gameShema);
//--------------Passport methods
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new FacebookStrategy({clientID: 1407452696183445, clientSecret: 'c605da1649e7a88bcc8fef63a2454fb0', callbackURL: "http://udovikov-win8.nixsolutions.com:1337/auth/facebook/callback"},
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      return done(null, profile);
    });
  }
));

//----------------Authorization and facebook func
app.get('/auth/facebook',
  passport.authenticate('facebook'),
  function(req, res){
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
  });

app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
      var user = new User({
            id : req.user.id,
            name : req.user.displayName,
            age : req.user.age,
            isAuthorized : true,
            battlesCount : 0,
            winInBattlesCount : 0,
            isInGame : false
      });

      User.find({ id: req.user.id }, function(err, usr) {
          if (usr.length == 0) {
              user.save(function(er, us) { return us; });
          } 
          userList.push(user);
          res.redirect('/');
      });
  });

app.get('/logout', function(req, res){
    var position = -1;
    userList.forEach(function (value, index, ar) {
        if (value.id == req.user.id) {
            position = index;
        }
    });
    
  if (position >= 0) {
      userList.splice(position, 1);
  }
    
  req.logout();
  res.redirect('/');
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { 
      return next(); }
  return res.redirect('/');
}

//--------------- Routing page for app
app.get('/', function(req, res){
    res.sendfile('./views/index.html');
});

app.get('/game', ensureAuthenticated, function(req, res){
      res.sendfile('./views/game.html');
});

//-----------------RESTfull API
app.get('/api/initializeUserInGame', ensureAuthenticated, function(req, res) {
    User.find({ id: req.user.id }, function(error, fUser) {
        Game.find({ userList: { $elemMatch: { id: req.user.id } } }, function(er, gm) {
            res.json({ 'currentUser': fUser[0], 
                   'userList': userList, 
                   'availableGames':availableGames, 
                   'historiesList' : gm});
        });   
    });
});

app.get('/api/createGame', ensureAuthenticated, function(req, res) {
    var game = new Game({
        id : Date.now.toString(),
        userList : [],
        history : [],
        status : ''
    });
    User.find({ id: req.user.id }, function(error, fUser) {
        game.userList.push(fUser.id);
        game.save(function(er, gm) { return gm; });
        gameList.push(game);
    });    
});

app.get('/api/getStatisticOfGames', ensureAuthenticated, function(req, res) {
    User.find({}, function(error, fUser) {
         Game.find({}, function(er, gm) {
            res.json({ 'allUserList': fUser, 
                   'allGamesList': gm});   
             }); 
    });
});

app.get('api/shareFB',ensureAuthenticated,function(req, res) {
    
var options = true;
openGraph.publish('1407452696183445', 'some-accessc605da1649e7a88bcc8fef63a2454fb0token', options, function(err, response) {
    response.write("hello it's MEAN chess");
    response.end();
});
});

app.get('/api/isAuthenticated', function(req, res) {
    if (req.isAuthenticated()) {
        res.json({ 'isAuthenticated': 'true' });
    } else {
        res.json({ 'isAuthenticated': 'false' });
    }
});

function createNewGame(serverName, roomId) {
    var chess = new ch.Chess();
    availableGames.push({ serverName: serverName, roomId: roomId });
    chessList.push(chess);
    return chess;
}

io.sockets.on('connection', function(socket) {
    socket.on('onCreateGame', function(data) {
        var game = createNewGame(data.serverName, socket.id);
        socket.join(socket.id);
        socket.emit('createGame',{roomId: socket.id, create:true}); 
        socket.broadcast.emit('newGameCreated', { serverName:data.serverName, roomId: socket.id, game : game });
    });

    socket.on('onJoinGame',function(data) {
        var playersInRoom = io.sockets.clients(data.roomId);
        if (playersInRoom.length == 1) {
            socket.join(data.roomId);
            socket.emit('startNewGame',{orientation: 'black'});
            socket.broadcast.to(data.roomId).emit('startNewGame', { orientation: 'white'});
        }
    });
    
    socket.on('onMove', function (data) {
        socket.broadcast.to(data.roomId).emit('moveFromServer', data);
        console.log(data);
    });

    socket.on('onSendMessage', function (data) {
        socket.broadcast.to(data.roomId).emit('newMessage', data);
        console.log(data);
    });

    socket.on('onSaveGame',function(data) {
        var gameToSave = new Game({
            id : data.roomId,
            userList : data.userList,
            history : data.game,
            status : data.gameName
        });
        
        gameToSave.save(function(er, gm) { return gm; });
    });

    socket.on('onLogout', function (roomId) {
        var position = -1;
        availableGames.forEach(function (value, index, ar) {
            if (value.roomId == roomId) {
                position = index;
            }
        });
        if (position >= 0) {
            availableGames.splice(position, 1);
            socket.broadcast.emit('gameIsClosed', availableGames);
        }
        socket.leave(roomId);
    });

    socket.on('disconnect', function(data) {
        var position = -1;
        availableGames.forEach(function (value, index, ar) {
            if (value.roomId == socket.id) {
                position = index;
            }
        });
        if (position >= 0) {
            availableGames.splice(position, 1);
            socket.broadcast.emit('gameIsClosed', availableGames);
        }
    });
});