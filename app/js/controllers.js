var riverBetaControllers = angular.module('riverBetaControllers', [ 'ngSanitize' ]);

riverBetaControllers.controller('MapController', ['$scope', '$http', '$location', 'leafletData', 'leafletEvents', 'riverMethods',
    function($scope, $http, $location, leafletData, leafletEvents, riverMethods) {
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
                    rapids: {
                        name: 'Rapids',
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
            markers: {},
            centerMarker: {},
            events: {
                markers: {
                    enable: leafletEvents.getAvailableMarkerEvents()
                }
            },
            rivers: [],
            gauges: [],
            runs: [],
            rapids: [],
            markerTypes: ['gauge', 'rapid', 'poi']
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
            var marker = _.where($scope.gauges, {_id: args.markerName});
            if (!!marker) {
                $location.path('/detail/gauge/' + args.markerName);
            }
        });
        $scope.$on('leafletDirectiveMap.pathClick', function(e, featureSelected, leafletEvent) {
            console.log(e)
            console.log(featureSelected);
            console.log(leafletEvent);
        });

        function afterRiversCallback() {
            riverMethods.resourceQuery($scope, 'gauge', riverMethods.getFullGauge, afterGaugesCallback);
            riverMethods.resourceQuery($scope, 'rapid', riverMethods.setUpRapid);
        }
        function afterGaugesCallback() {
            riverMethods.resourceQuery($scope, 'run', riverMethods.setUpRun);
        }

        riverMethods.resourceQuery($scope, 'river', null, afterRiversCallback)
    }]);

riverBetaControllers.controller('IndexController', ['$scope', '$http',
    function($scope, $http) {
        $scope.deleteThing = function(id, type) {
            var types = type + 's'
            var thing = _.findWhere($scope[types], {_id: id});
            $http.delete('/api/' + type + 's/' + id)
                .success(function(data) {
                    switch (type) {
                        case 'run':
                            $scope.$parent.map.removeLayer(thing.path);
                            break;
                        case 'rapid':
                            // TODO: remove rapid marker
                            break;
                    }
                    $scope.$parent[types] = _.reject($scope.$parent[types], function(item) {
                        return item._id == id;
                    });
                })
                .error(function(data) {
                    console.log('Error deleting ' + type + ': ' + data);
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
                    console.log('Error: ' + data);
                });
        };
        if ($scope.markerTypes.indexOf($scope.type) > -1) {
            // new object has a point location associated with it.
            // add a marker for this point and set up events
            $scope.object.loc = {
                type: 'Point',
                coordinates: [0, 0]
            }
            var center = $scope.$parent.map.getCenter();
            $scope.object.loc.coordinates[0] = Math.round(center.lat  * Math.pow(10, 10)) / Math.pow(10, 10);
            $scope.object.loc.coordinates[1] = Math.round(center.lng * Math.pow(10, 10)) / Math.pow(10, 10);
            $scope.centerMarker = new L.marker(center, {
                draggable: true,
                title: 'Center Marker'
            }).on('move', function(e) {
                $scope.object.loc.coordinates[0] = Math.round(e.latlng.lat * Math.pow(10, 10)) / Math.pow(10, 10);
                $scope.object.loc.coordinates[1] = Math.round(e.latlng.lng * Math.pow(10, 10)) / Math.pow(10, 10);
            }).addTo($scope.$parent.map);
            $scope.$parent.map.on('click', function(e) {
                $scope.centerMarker.setLatLng([e.latlng.lat, e.latlng.lng]);
            });
            // remove events and marker when we leave this view.
            $scope.$on('$destroy', function() {
                $scope.$parent.map.removeLayer($scope.centerMarker);
                $scope.$parent.map.off('click');
            });
        }
    }]);

riverBetaControllers.controller('RunAddController', ['$scope', '$http', '$location', '$upload', 'riverMethods',
    function($scope, $http, $location, $upload, riverMethods) {
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
                    $scope.object.gpx_file = {
                        size: response.config.file.size,
                        fileName: response.config.file.name,
                        lastModified: response.config.file.lastModifiedDate
                    }
                    $http.post('/api/runs', $scope.object)
                        .success(function(data) {
                            $scope.$parent.runs.push(data);
                            riverMethods.setUpRun($scope.$parent, data);
                            console.log(data);
                            $location.path('/detail/run/' + data._id);
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

riverBetaControllers.controller('EditController', ['$scope', '$http', '$location', '$upload', '$route', '$routeParams', 'riverMethods',
    function($scope, $http, $location, $upload, $route, $routeParams, riverMethods) {
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
                            riverMethods.getFullGauge($scope.$parent, $scope.object, $route.reload);
                            break;
                        case 'run':
                            riverMethods.setUpRun($scope.$parent, $scope.object);
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

riverBetaControllers.controller('DetailController', ['$scope', '$http', '$route', '$routeParams', 'riverMethods',
    function($scope, $http, $route, $routeParams, riverMethods) {
        $scope.type = $routeParams.type;
        $scope.types = $scope.type + 's';
        $scope.id = $routeParams.id;
        $scope.templateUrl = 'partials/detail/' + $scope.type + '.html';
        $scope.object = _.findWhere($scope.$parent[$scope.types], {_id: $scope.id});
        if ($scope.$parent.hasOwnProperty($scope.types) && !!$scope.object) {
            var zoom = 12;
            if ($scope.type == 'rapid') {
                zoom = 14;
            }
            if ($scope.object.hasOwnProperty('loc') && $scope.object.loc.type == "Point") {
                $scope.$parent.map.setZoom(zoom).panTo([$scope.object.loc.coordinates[0], $scope.object.loc.coordinates[1]])
            } else if ($scope.object.hasOwnProperty('marker')) {
                $scope.$parent.map.setZoom(zoom).panTo([$scope.object.marker.lat, $scope.object.marker.lng])
            } else if ($scope.object.hasOwnProperty('path')) {
                $scope.$parent.map.fitBounds($scope.object.path.getBounds(), { padding: [20, 20] });
            } else {
                console.log("can't pan to");
                switch ($scope.type) {
                    case 'rapid':
                        riverMethods.setUpRapid($scope.$parent, $scope.object, $route.reload);
                        break;
                    case 'river':
                        // get all river stuff
                        $scope.object_runs = _.findWhere($scope.$parent.runs, {river: $scope.id});
                        break;
                }
            }
        } else {
            $http.get('/api/' + $scope.types + '/' + $scope.id)
                .success(function(thing) {
                    if (!!thing) {
                        $scope.object = _.findWhere($scope.$parent[$scope.types], {_id: $scope.id});
                        if (!$scope.object) {
                            $scope.object = thing;
                            $scope.$parent[$scope.types].push($scope.object);
                        }
                        switch ($scope.type) {
                            case 'gauge':
                                riverMethods.getFullGauge($scope.$parent, $scope.object, $route.reload);
                                break;
                            case 'run':
                                riverMethods.setUpRun($scope.$parent, $scope.object);
                                $route.reload();
                                break;
                            case 'rapid':
                                riverMethods.setUpRapid($scope.$parent, $scope.object, $route.reload);
                                break;
                        }
                    } else {
                        console.log('no such ' + $scope.type);
                    }
                })
                .error(function(data) {
                    console.log('Error loading thing: ' + data);
                });
        }
    }]);
