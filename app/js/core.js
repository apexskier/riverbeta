var riverBeta = angular.module('riverBeta', [
    'ngRoute',
    'angularFileUpload',
    'leaflet-directive',
    'riverBetaControllers',
    'riverServices',
    'd3AngularDirective',
]);

riverBeta.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
            when('/', {
                templateUrl: 'partials/index.html',
                controller: 'IndexController'
            }).
            when('/add', {
                redirectTo: '/'
            }).
            when('/add/river', {
                templateUrl: 'partials/add/river.html',
                controller: 'RiverAddController'
            }).
            when('/add/gauge', {
                templateUrl: 'partials/add/gauge.html',
                controller: 'GaugeAddController'
            }).
            when('/add/run', {
                templateUrl: 'partials/add/run.html',
                controller: 'RunAddController'
            }).
            when('/detail/:type/:id', {
                templateUrl: 'partials/detail/gauge.html',
                controller: 'DetailController'
            }).
            otherwise({
                redirectTo: '/'
            });
    }
]);
