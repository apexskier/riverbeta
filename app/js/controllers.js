var riverBetaControllers = angular.module('riverBetaControllers', [ 'ngSanitize' ]);

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
            },
            runs: [],
            gauges: []
        });

        leafletData.getMap().then(function(map) {
            $scope.map = map;
            console.log($scope);
            $scope.map.locate({setView: false, maxZoom: 14});
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
                        _.each(data, function(gauge) {
                            if (!_.where($scope.gauges, {_id: gauge._id}).length) {
                                $scope.gauges.push(gauge);
                                gaugeMethods.getFullGauge($scope, gauge);
                            }
                        });
                        $http.get('/api/runs')
                            .success(function(data) {
                                _.each(data, function(run) {
                                    if (!_.where($scope.runs, {_id: run._id}).length) {
                                        $scope.runs.push(run);
                                        gaugeMethods.setUpRun($scope, run);
                                    }
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
                    $scope.$parent.rivers = data;
                    console.log(data);
                })
                .error(function(data) {
                    console.log('Error deleting river: ' + data);
                });
        };
        $scope.deleteRun = function(id) {
            var path = _.findWhere($scope.$parent.runs, { _id: id }).path;
            $http.delete('/api/runs/' + id)
                .success(function(data) {
                    $scope.$parent.map.removeLayer(path);
                    $scope.$parent.runs = data;
                })
                .error(function(data) {
                    console.log('Error deleting run: ' + data);
                });
        };
        $scope.deleteGauge = function(id) {
            $http.delete('/api/gauges/' + id)
                .success(function(data) {
                    $scope.$parent.gauges = data;
                    console.log(data);
                })
                .error(function(data) {
                    console.log('Error deleting gauge: ' + data);
                });
        };
    }]);

riverBetaControllers.controller('AddController', ['$scope', '$http', '$location', '$routeParams',
    function($scope, $http, $location, $routeParams) {
        $scope.object = {};
        $scope.type = $routeParams.type;
        $scope.types = $scope.type + 's';
        $scope.templateUrl = 'partials/add/' + $scope.type + '.html';
        $scope.createThing = function() {
            console.log($scope.object);
            $http.post('/api/' + $scope.types, $scope.object)
                .success(function(data) {
                    $scope.$parent[$scope.types].push(data);
                    console.log($scope.types);
                    console.log(data);
                    $location.path('/detail/' + $scope.type + '/' + data._id);
                })
                .error(function(data) {
                    console.og('Error: ' + data);
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
                            $scope.$parent.runs.push(data);
                            gaugeMethods.setUpRun($scope.$parent, data);
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

riverBetaControllers.controller('EditController', ['$scope', '$http', '$location', '$upload', '$route', '$routeParams', 'gaugeMethods',
    function($scope, $http, $location, $upload, $route, $routeParams, gaugeMethods) {
        $scope.type = $routeParams.type;
        $scope.types = $scope.type + 's';
        $scope.id = $routeParams.id;
        $scope.templateUrl = 'partials/edit/' + $scope.type + '.html';
        $scope.object = _.findWhere($scope.$parent[$scope.types], {_id: $scope.id});
        if ($scope.$parent.hasOwnProperty($scope.types) && $scope.object) {
            console.log($scope.object);
            if ($scope.object.hasOwnProperty('marker')) {
                $scope.$parent.map.setZoom(12).panTo([$scope.object.marker.lat, $scope.object.marker.lng])
            } else if ($scope.object.hasOwnProperty('path')) {
                $scope.$parent.map.fitBounds($scope.object.path.getBounds(), { padding: [20, 20] });
            } else {
                console.log("can't pan to");
                console.log($scope.object);
            }
        } else {
            $http.get('/api/' + $scope.types + '/' + $scope.id)
                .success(function(thing) {
                    $scope.object = _.findWhere($scope.$parent[$scope.types], {_id: $scope.id});
                    if (!$scope.object) {
                        $scope.object = thing;
                        $scope.$parent[$scope.types].push($scope.object);
                    }
                    switch ($scope.type) {
                        case 'gauge':
                            function cb() {
                                $route.reload();
                            }
                            gaugeMethods.getFullGauge($scope.$parent, $scope.object, cb);
                            break;
                        case 'run':
                            gaugeMethods.setUpRun($scope.$parent, $scope.object);
                            $route.reload();
                            break;
                    }
                })
                .error(function(data) {
                    console.log('Error loading thing: ' + data);
                });
        }
        $scope.updateThing = function() {
            console.log($scope.object);
            $http.put('/api/' + $scope.types + '/' + $scope.id, _.omit($scope.object, 'path'))
                .success(function(data) {
                    $location.path('/detail/' + $scope.type + '/' + data._id);
                })
                .error(function(err) {
                    console.log('Error: ' + err);
                });
        };
    }]);

riverBetaControllers.controller('DetailController', ['$scope', '$http', '$route', '$routeParams', 'gaugeMethods',
    function($scope, $http, $route, $routeParams, gaugeMethods) {
        $scope.type = $routeParams.type;
        $scope.types = $scope.type + 's';
        $scope.id = $routeParams.id;
        $scope.templateUrl = 'partials/detail/' + $scope.type + '.html';
        $scope.object = _.findWhere($scope.$parent[$scope.types], {_id: $scope.id});
        if ($scope.$parent.hasOwnProperty($scope.types) && $scope.object) {
            console.log($scope.object);
            if ($scope.object.hasOwnProperty('marker')) {
                $scope.$parent.map.setZoom(12).panTo([$scope.object.marker.lat, $scope.object.marker.lng])
            } else if ($scope.object.hasOwnProperty('path')) {
                $scope.$parent.map.fitBounds($scope.object.path.getBounds(), { padding: [20, 20] });
            } else {
                console.log("can't pan to");
            }
        } else {
            $http.get('/api/' + $scope.types + '/' + $scope.id)
                .success(function(thing) {
                    $scope.object = _.findWhere($scope.$parent[$scope.types], {_id: $scope.id});
                    if (!$scope.object) {
                        $scope.object = thing;
                        $scope.$parent[$scope.types].push($scope.object);
                    }
                    switch ($scope.type) {
                        case 'gauge':
                            function cb() {
                                $route.reload();
                            }
                            gaugeMethods.getFullGauge($scope.$parent, $scope.object, cb);
                            break;
                        case 'run':
                            gaugeMethods.setUpRun($scope.$parent, $scope.object);
                            $route.reload();
                            break;
                    }
                })
                .error(function(data) {
                    console.log('Error loading thing: ' + data);
                });
        }
    }]);
