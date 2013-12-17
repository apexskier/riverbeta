var riverBetaControllers = angular.module('riverBetaControllers', []);

riverBetaControllers.controller('MapController', ['$scope', '$http', '$location', 'leafletData', 'leafletEvents', 'gaugeMethods',
    function($scope, $http, $location, leafletData, leafletEvents, gaugeMethods) {
        angular.extend($scope, {
            tileLayer: "http://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png",
            maxZoom: 14,
            layers: {
                baselayers: {
                    osm_landscape: {
                        name: 'OpenCycleMap',
                        type: 'xyz',
                        url: 'http://{s}.tile3.opencyclemap.org/cycle/{z}/{x}/{y}.png',
                        visible: true,
                        layerOptions: {
                            subdomains: ['a', 'b', 'c'],
                            attribution: '&copy; <a href="http://www.opencyclemap.org/copyright">OpenCycleMap</a> contributors - &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                            continuousWorld: true,
                            detectRetina: true
                        }
                    },
                    mq_sat: {
                        name: 'MapQuest Satellite',
                        type: 'xyz',
                        visible: false,
                        url: 'http://otile4.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg',
                        layerOptions: {
                            attribution: 'Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a>',
                            detectRetina: true
                        }
                    }
                },
                overlays: {
                    gauges: {
                        name: 'Gauges',
                        type: 'group',
                        visible: true
                    },
                    pois: {
                        name: 'Markers',
                        type: 'group',
                        visible: true
                    }
                },
            },
            controls: {
                position: 'topleft'
            },
            markers: { },
            events: {
                markers: {
                    enable: leafletEvents.getAvailableMarkerEvents()
                }
            }
        });

        leafletData.getMap().then(function(map) {
            $scope.map = map;
            console.log($scope);
            map.locate({setView: false, maxZoom: 14});
        });
        $scope.$on('leafletDirectiveMap.locationfound', function(e, data) {
            L.circle(data.leafletEvent.latlng, data.leafletEvent.accuracy).addTo($scope.map);
        });
        $scope.$on('leafletDirectivePath.click', function(e, args) {
            console.log('click event');
            console.log(e);
            console.log(args);
        });
        $scope.$on('leafletDirectiveMarker.click', function(e, args) {
            console.log('click event');
            console.log(e);
            console.log(args);
        });
        $scope.$on('leafletDirectiveMap.pathClick', function(e, featureSelected, leafletEvent) {
            console.log(e)
            console.log(featureSelected);
            console.log(leafletEvent);
        });

        $http.get('/api/rivers')
            .success(function(data) {
                $scope.rivers = data;
                $http.get('/api/gauges')
                    .success(function(data) {
                        $scope.gauges = data;
                        _.each($scope.gauges, function(gauge) {
                            gaugeMethods.getFullGauge($scope, gauge);
                        });
                        $http.get('/api/runs')
                            .success(function(data) {
                                $scope.runs = data;
                                _.each(data, function(run) {
                                    console.log(run);
                                    gaugeMethods.setUpRun($scope, run);
                                });
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
            var path = _.findWhere($scope.runs, { _id: id }).path;
            $http.delete('/api/runs/' + id)
                .success(function(data) {
                    $scope.map.removeLayer(path);
                    $scope.runs = data;
                })
                .error(function(data) {
                    console.log('Error deleting run: ' + data);
                });
        };
        $scope.deleteGauge = function(id) {
            $http.delete('/api/gauges/' + id)
                .success(function(data) {
                    $scope.gauges = data;
                    console.log(data);
                })
                .error(function(data) {
                    console.log('Error deleting gauge: ' + data);
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

riverBetaControllers.controller('RunAddController', ['$scope', '$http', '$location', '$upload', 'gaugeMethods',
    function($scope, $http, $location, $upload, gaugeMethods) {
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
                    $scope.formData.gpx_file = {
                        size: response.config.file.size,
                        fileName: response.config.file.name,
                        lastModified: response.config.file.lastModifiedDate
                    }
                    $http.post('/api/runs', $scope.formData)
                        .success(function(data) {
                            $scope.runs.push(data);
                            gaugeMethods.setUpRun($scope, data);
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

riverBetaControllers.controller('GaugeDetailController', ['$scope', '$http', '$route', '$routeParams', 'gaugeMethods',
    function($scope, $http, $route, $routeParams, gaugeMethods) {
        if ($scope.$parent.hasOwnProperty('gauges')) {
            console.log($scope.$parent);
            var object = _.findWhere($scope.$parent.gauges, {_id: $routeParams.gauge_id});
            console.log(object);
            angular.extend($scope, {
                detailObject: object
            });
            $scope.$parent.map.setZoom(12).panTo([object.marker.lat, object.marker.lng]);
            console.log($scope.detailObject);
        } else {
            $http.get('/api/gauges/' + $routeParams.gauge_id)
                .success(function(gauge) {
                    $scope.gauges = [gauge];
                    gaugeMethods.getFullGauge($scope, gauge, $route.reload);
                })
                .error(function(data) {
                    console.log('Error loading gauge: ' + data);
                });
        }
}]);
