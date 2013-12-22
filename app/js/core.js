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
        $routeProvider
            .when('/', {
                templateUrl: 'partials/index.html',
                controller: 'IndexController',
                reloadOnSearch: false
            })
            .when('/add/run', {
                templateUrl: 'partials/add/run.html',
                controller: 'RunAddController',
                reloadOnSearch: false
            })
            .when('/add/:type', {
                templateUrl: 'partials/add/index.html',
                controller: 'AddController',
                reloadOnSearch: false
            })
            .when('/edit/:type/:id', {
                templateUrl: 'partials/edit/index.html',
                controller: 'EditController',
                reloadOnSearch: false
            })
            .when('/detail/:type/:id', {
                templateUrl: 'partials/detail/index.html',
                controller: 'DetailController',
                reloadOnSearch: false
            })
            .otherwise({
                redirectTo: '/'
            });
    }
]);
