var gameCtrl = angular.module('gameCtrl', []);

function indexController($scope, $http) {
    $scope.isAuthenticated = false;
    $scope.isHasAvailableGame = false;
    $scope.currentUser = {};
    $scope.userList = [];

    $http.get('api/isAuthenticated')
		.success(function (data) {
		    $scope.isAuthenticated = data.isAuthenticated;
		})
		.error(function (data) {
		    console.log('Error: ' + data);
		});

    //$scope.logOff = function() {
    //    $scope.isAuthenticated = false;
    //};

    //$scope.createGame = function() {
    //    $http.get('api/createGame')
    //        .success(function(data) {
    //            //$scope.currentUser = data.currentUser;
    //            //$scope.userList = data.userList;
    //            //window.globalScope.$location.url("/game");
    //        })
    //        .error(function(data) {
    //            console.log('Error: ' + data);
    //        });
    //};

    //$scope.cfg = {
    //    draggable: true,
    //    dropOffBoard: 'snapback',
    //    position: 'start',
    //    onChange: $scope.onChange,
    //    onDrop: $scope.onDrop,
    //};
    //$scope.board = new ChessBoard('board', $scope.cfg);
}