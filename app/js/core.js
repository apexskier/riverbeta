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
                controller: 'IndexController'
            })
            .when('/add/run', {
                templateUrl: 'partials/add/run.html',
                controller: 'RunAddController'
            })
            .when('/add/:type', {
                templateUrl: 'partials/add/index.html',
                controller: 'AddController'
            })
            .when('/edit/:type/:id', {
                templateUrl: 'partials/edit/index.html',
                controller: 'EditController'
            })
            .when('/detail/:type/:id', {
                templateUrl: 'partials/detail/index.html',
                controller: 'DetailController'
            })
            .otherwise({
                redirectTo: '/'
            });
    }
]);
