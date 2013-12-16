var riverBetaControllers = angular.module('riverBetaControllers', []);

riverBetaControllers.controller('MapController', ['$scope', '$http', '$location',
    function($scope, $http, $location) {
        angular.extend($scope, {
            tileLayer: "http://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png",
            maxZoom: 14,
            layers: {
                baselayers: {
                    osm: {
                        name: 'OpenStreetMap WMS Omniscale',
                        type: 'wms',
                        url: 'http://osm.omniscale.net/proxy/service',
                        layerOptions: {
                            layers: 'osm',
                            format: 'image/png'
                        }
                    },
                    osm_landscape: {
                        name: 'OpenCycleMap',
                        type: 'xyz',
                        url: 'http://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png',
                        layerOptions: {
                            subdomains: ['a', 'b', 'c'],
                            attribution: '&copy; <a href="http://www.opencyclemap.org/copyright">OpenCycleMap</a> contributors - &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                            continuousWorld: true
                        }
                    }
                }
            },
            overlays: {
                runs: {
                    name: 'Runs',
                    type: 'group',
                    visible: true
                },
                gauges: {
                    name: 'Gauges',
                    type: 'group',
                    visible: true
                }
            }
        });

        $http.get('/api/rivers')
            .success(function(data) {
                $scope.rivers = data;
                $http.get('/api/gauges')
                    .success(function(data) {
                        $scope.gauges = _.map(data, function(gauge) {
                            gauge.river_object = _.findWhere($scope.rivers, {_id: gauge.river});
                            return gauge;
                        });
                        $http.get('/api/runs')
                            .success(function(data) {
                                $scope.runs = data;
                            })
                            .error(function(data) {
                                console.log('Error loading runs: ' + data);
                            });
                    })
                    .error(function(data) {
                        console.log('Error loading gauges: ' + data);
                    });
            })
            .error(function(data) {
                console.log('Error loading rivers: ' + data);
            });
}]);

riverBetaControllers.controller('IndexController', ['$scope', '$http',
    function($scope, $http) {
        $scope.deleteRiver = function(id) {
            $http.delete('/api/rivers/' + id)
                .success(function(data) {
                    $scope.rivers = data;
                    console.log(data);
                })
                .error(function(data) {
                    console.log('Error deleting river: ' + data);
                });
        };
        $scope.deleteRun = function(id) {
            $http.delete('/api/runs/' + id)
                .success(function(data) {
                    $scope.runs = data;
                    console.log(data);
                })
                .error(function(data) {
                    console.log('Error deleting run: ' + data);
                });
        };
}]);

riverBetaControllers.controller('RiverAddController', ['$scope', '$http', '$location',
    function($scope, $http, $location) {
        $scope.createRiver = function() {
            $http.post('/api/rivers', $scope.formData)
                .success(function(data) {
                    $scope.rivers.push(data);
                    console.log(data);
                    $location.path('/');
                })
                .error(function(data) {
                    console.log('Error: ' + data);
                });
        };
}]);

riverBetaControllers.controller('GaugeAddController', ['$scope', '$http', '$location',
    function($scope, $http, $location) {
        $scope.createGauge = function() {
            $http.post('/api/gauges', $scope.formData)
                .success(function(data) {
                    $scope.gauges.push(data);
                    console.log(data);
                    $location.path('/');
                })
                .error(function(data) {
                    console.log('Error: ' + data);
                });
        };
}]);

riverBetaControllers.controller('RunAddController', ['$scope', '$http', '$location', '$upload',
    function($scope, $http, $location, $upload) {
        $scope.selectedFiles = [];
        $scope.onFileSelect = function($files) {
            $scope.progress = [];
            $scope.upload = [];
            $scope.uploadResult = [];
            $scope.selectedFiles = $files;
            $scope.dataUrls = [];
        }
        $scope.createRun = function() {
            for (var i = 0; i < $scope.selectedFiles.length; i++) {
                var file = $scope.selectedFiles[i];
                $scope.progress[i] = 0;
                $scope.upload[i] = $upload.upload({
                    url: '/upload/run',
                    data: { },
                    file: file
                }).then(function(response) {
                    console.log('Uploaded: ' + response.data.path);
                    console.log(response);
                    $scope.formData.gpx_file = {
                        size: response.config.file.size,
                        name: response.config.file.name,
                        lastModified: response.config.file.lastModifiedDate
                    }
                    $http.post('/api/runs', $scope.formData)
                        .success(function(data) {
                            console.log(data);
                            $location.path('/');
                        })
                        .error(function(data) {
                            console.log('Error: ' + data);
                        });
                }, function(err) {
                    console.log('Error uploading: ' + err);
                }, function(e) {
                    console.log('percent: ' + parseInt(100.0 * e.loaded / e.total));
                });
            }
        };
}]);
