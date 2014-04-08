var gameCtrl = angular.module('gameCtrl', []);

function gameController($scope, $http) {
    $scope.gameName = "Chess game";
    $scope.roomId = "";
    $scope.gameServer = [];
    $scope.gameLog = [];
    $scope.historyLog = [];
    $scope.currentUser = {};
    $scope.userList = [];
    $scope.availableGames = [];
    $scope.chat = [];
    $scope.isStarted = false;
    $scope.isCreated = false;
    $scope.isWaitToConnection = false;
    $scope.date = new Date();
    $scope.isWhiteTurn = true;
    $scope.isHistory = false;
    $scope.isSimulating = false;

    $http.get('api/initializeUserInGame')
            .success(function (data) {
                $scope.currentUser = data.currentUser;
                $scope.userList = data.userList;
                $scope.availableGames = data.availableGames;
                $scope.historiesList = data.historiesList;
            })
            .error(function (data) {
                console.log('Error: ' + data);
            });

    $scope.createGame = function () {
        $http.get('api/createGame')
            .success(function (data) {
            })
            .error(function (data) {
                console.log('Error: ' + data);
            });
    };

    $scope.board = new Chess();
    $scope.game = new Chess();

    $scope.removeGreySquares = function () {
        $('#board .square-55d63').css('background', '');
    };

    $scope.greySquare = function (square) {
        var squareEl = $('#board .square-' + square);

        var background = '#eaeaea';
        if (squareEl.hasClass('black-3c85d') === true) {
            background = '#c9c9c9';
        }

        squareEl.css('background', background);
    };

    $scope.onDragStart = function (source, piece, position, orientation) {
        var or = orientation.charAt(0);
        if ($scope.game.game_over() === true || $scope.game.in_draw() === true ||
            ($scope.game.turn() != or)) {
            return false;
        }
    };

    $scope.onDrop = function (source, target, piece) {
        $scope.removeGreySquares();

        // see if the move is legal
        var move = $scope.game.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        // illegal move
        if (move === null) return 'snapback';
        var newStep = { 'source': source, 'target': target, 'piece': piece, timestamp: new Date().toLocaleTimeString(), stepDuration: Math.round(Date.now() / 1000 - $scope.date) };
        $scope.gameLog.push(newStep);
        move.piece = piece;
        $scope.socket.emit('onMove', move);
        reset();
        $scope.onSnapEnd();
        start();
        $scope.isWhiteTurn = $scope.game.turn() == 'w';
        $scope.$apply();
    };

    $scope.doHistoryStep = function (step) {
        var move = $scope.game.move({
            from: step.source,
            to: step.target,
            promotion: 'q'
        });
        $scope.gameLog.push(step);
        $scope.$apply();
        $scope.onSnapEnd();
    };

    $scope.startSimulation = function () {
        $scope.isSimulating = true;
        var timeout = 1000;
        $scope.historyLog.forEach(function (step) {
            setTimeout(function () { $scope.doHistoryStep(step); }, timeout);
            timeout = timeout + 1000;
        });
    };

    $scope.stopSimulation = function () {
        $scope.isSimulating = false;
        $scope.gameLog.clear();
        $scope.board = new ChessBoard('board', $scope.cfg);
    };

    $scope.onMouseoverSquare = function (square, piece, position, orientation) {
        var moves = $scope.game.moves({
            square: square,
            verbose: true
        });

        if (moves.length === 0) return;

        var or = orientation.charAt(0);
        if ($scope.game.game_over() === true || $scope.game.in_draw() === true ||
            ($scope.game.turn() != or)) {
            return false;
        }

        $scope.greySquare(square);

        for (var i = 0; i < moves.length; i++) {
            $scope.greySquare(moves[i].to);
        }
    };

    $scope.onMouseoutSquare = function (square, piece) {
        $scope.removeGreySquares();
    };

    $scope.onSnapEnd = function () {
        $scope.board.position($scope.game.fen());
    };

    $scope.logout = function () {
        $scope.socket.emit('onLogout', $scope.roomId);
    };

    $scope.cfg = {
        draggable: true,
        dropOffBoard: 'snapback',
        position: 'start',
        onChange: $scope.onChange,
        onDrop: $scope.onDrop,
        onDragStart: $scope.onDragStart,
        onMouseoutSquare: $scope.onMouseoutSquare,
        onMouseoverSquare: $scope.onMouseoverSquare,
        onSnapEnd: $scope.onSnapEnd
    };

    $scope.board = new ChessBoard('board');

    $scope.startNewGame = function (data) {
        $scope.createGame();
        $scope.cfg.orientation = data;
        $scope.board = new ChessBoard('board', $scope.cfg);
        $scope.isStarted = true;
        $scope.isWhiteTurn = $scope.game.turn() == 'w';
        $scope.$apply();
    };

    $scope.socket = io.connect('http://udovikov-win8.nixsolutions.com:1337');

    $scope.createNewGame = function () {
        $scope.socket.emit('onCreateGame', { serverName: $scope.currentUser.name, create: true });
    };

    $scope.saveGame = function () {
        $scope.socket.emit('onSaveGame', { game: $scope.gameLog, userList: $scope.userList, roomId: $scope.roomId, gameName: $scope.gameName });
        $scope.showModal = false;
    };

    $scope.exitGame = function () {
        location.reload();
    };

    $scope.showStatistic = function () {
        $http.get('api/getStatisticOfGames')
           .success(function (data) {
               $scope.statisticUserList = data.allUserList;
               $scope.statisticGameList = data.allGamesList;
           })
           .error(function (data) {
               console.log('Error: ' + data);
           });
        $scope.showStatisticModal = true;
    };

    $scope.showHistory = function (history) {
        $scope.historyLog = history.history;
        $scope.gameLog= [];
        $scope.board = new ChessBoard('board', $scope.cfg);
        $scope.isHistory = true;
        $scope.isCreated = true;
        $scope.isSimulating = false;
    };

    $scope.joinToGame = function (data) {
        $scope.roomId = data;
        $scope.socket.emit('onJoinGame', { roomId: data });
    };

    $scope.socket.on('createGame', function (data) {
        $scope.isCreated = true;
        $scope.isWaitToConnection = true;
        $scope.$apply();
        $scope.roomId = data.roomId;
        $scope.createGame();
    });

    $scope.socket.on('newGameCreated', function (data) {

        $scope.availableGames.push({ serverName: data.serverName, roomId: data.roomId });
        $scope.$apply();
    });

    $scope.socket.on('startNewGame', function (data) {
        $scope.date = Date.now() / 1000;
        show();
        start();

        $scope.isCreated = true;
        $scope.isWaitToConnection = false;
        $scope.startNewGame(data.orientation);
    });

    $scope.socket.on('gameIsClosed', function (data) {
        $scope.availableGames = data;
        $scope.$apply();
    });

    $scope.socket.on('moveFromServer', function (data) {
        $scope.onDrop(data.from, data.to, data.piece);
        $scope.date = Date.now() / 1000;
    });

    $scope.sendMessage = function () {
        var data = { user: $scope.currentUser.name, message: $scope.message };
        $scope.chat.push(data);
        $scope.message = '';
        $scope.socket.emit('onSendMessage', data);
    };

    $scope.socket.on('newMessage', function (data) {
        $scope.chat.push(data);
        $scope.$apply();
    });

    $scope.onKeyPress = function (event) {
        if (event.which == 13)
            $scope.sendMessage();
    };
}
