var riverBetaControllers = angular.module('riverBetaControllers', [ 'ngSanitize' ]);

riverBetaControllers.controller('MapController', ['$scope', '$http', '$location', '$window', '$routeParams', 'leafletData', 'leafletEvents', 'riverMethods',
    function($scope, $http, $location, $window, $routeParams, leafletData, leafletEvents, riverMethods) {
        console.log(($window.innerHeight - 30) + 'px');
        $scope.marginTop = {'margin-top': ($window.innerHeight - 60) + 'px'};
        angular.element($window).bind('resize',function() {
            $scope.marginTop = {'margin-top': ($window.innerHeight - 60) + 'px'};
        });
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
            events: {
                markers: {
                    enable: leafletEvents.getAvailableMarkerEvents()
                }
            },
            rivers: [],
            gauges: [],
            runs: [],
            rapids: [],
            markerTypes: ['gauge', 'rapid', 'poi'],
            myListeners: {},
            ratings: [{
                    val: "I",
                    key: 1
                }, {
                    val: "I+",
                    key: 2
                }, {
                    val: "II",
                    key: 3
                }, {
                    val: "II+",
                    key: 4
                }, {
                    val: "III",
                    key: 5
                }, {
                    val: "III+",
                    key: 6
                }, {
                    val: "IV",
                    key: 7
                }, {
                    val: "IV+",
                    key: 8
                }, {
                    val: "V",
                    key: 9
                }, {
                    val: "V+",
                    key: 10
                }, {
                    val: "VI",
                    key: 11
                }],
            units: [{
                    val: "cfs",
                    key: "CFS"
                }, {
                    val: "ft",
                    key: "Feet"
                }, {
                    val: "m",
                    key: "Meters"
                }]
        });
        riverMethods.resourceQuery($scope, 'river')

        leafletData.getMap().then(function(map) {
            $scope.map = map;
            console.log($scope);
            function getLocalData() {
                var bounds = $scope.map.getBounds();
                var sw = bounds.getSouthWest();
                var ne = bounds.getNorthEast();
                var dist = Math.acos(Math.sin(sw.lat) * Math.sin(ne.lat) + Math.cos(sw.lat) * Math.cos(ne.lat) * Math.cos(sw.lng - ne.lng));
                var center = $scope.map.getCenter();
                var lat = Math.round(center.lat * 1000000) / 1000000;
                var lng = Math.round(center.lng * 1000000) / 1000000;
                riverMethods.resourceQuery($scope, 'gauge', null, afterGaugesCallback);
                riverMethods.resourceQuery($scope, {
                    type: 'rapid',
                    center: [lng, lat],
                    distance: dist
                }, riverMethods.setUpRapid);
            }
            function afterGaugesCallback() {
                var bounds = $scope.map.getBounds();
                var sw = bounds.getSouthWest();
                var ne = bounds.getNorthEast();
                var dist = Math.acos(Math.sin(sw.lat) * Math.sin(ne.lat) + Math.cos(sw.lat) * Math.cos(ne.lat) * Math.cos(sw.lng - ne.lng));
                var center = $scope.map.getCenter();
                var lat = Math.round(center.lat * 1000000) / 1000000;
                var lng = Math.round(center.lng * 1000000) / 1000000;
                riverMethods.resourceQuery($scope, {
                    type: 'run',
                    center: [lng, lat],
                    distance: dist
                }, riverMethods.setUpRun);
            }
            function updateUrl(e, args) {
                var center = $scope.map.getCenter();
                var lat = Math.round(center.lat * 1000000) / 1000000;
                var lng = Math.round(center.lng * 1000000) / 1000000;
                $location.search({
                    lat: lat,
                    lng: lng,
                    z: args.leafletEvent.target._zoom
                });
                getLocalData();
            }

            var locateSetView = false;
            coords = $location.search();
            if (coords.hasOwnProperty('lat')) {
                $scope.map.setView([parseFloat(coords.lat), parseFloat(coords.lng)], parseInt(coords.z));
                getLocalData();
            } else if ($location.path().length < 2) {
                locateSetView = true;
            }
            map.locate({setView: locateSetView, maxZoom: 12});

            $scope.myListeners.moveend = $scope.$on('leafletDirectiveMap.moveend', updateUrl);
            $scope.myListeners.zoomend = $scope.$on('leafletDirectiveMap.zoomend', updateUrl);
        });

        $scope.$on('leafletDirectiveMap.locationfound', function(e, data) {
            console.log('locationfound');
            L.circle(data.leafletEvent.latlng, data.leafletEvent.accuracy).addTo($scope.map);
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
    }]);

riverBetaControllers.controller('ControlsController', ['$scope', '$location',
    function($scope, $location) {

    }]);

riverBetaControllers.controller('IndexController', ['$scope', '$http', '$routeParams',
    function($scope, $http, $routeParams) {
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
            var center = $scope.$parent.map.getCenter();
            $scope.object.loc = {
                type: 'Point',
                coordinates: [center.lng, center.lat]
            }
            $scope.object.loc.coordinates[1] = Math.round(center.lat  * Math.pow(10, 10)) / Math.pow(10, 10);
            $scope.object.loc.coordinates[0] = Math.round(center.lng * Math.pow(10, 10)) / Math.pow(10, 10);
            $scope.centerMarker = new L.marker(center, {
                draggable: true,
                title: 'Center Marker'
            }).on('move', function(e) {
                $scope.object.loc.coordinates[1] = Math.round(e.latlng.lat * Math.pow(10, 10)) / Math.pow(10, 10);
                $scope.object.loc.coordinates[0] = Math.round(e.latlng.lng * Math.pow(10, 10)) / Math.pow(10, 10);
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
        $scope.filestatus = "";
        $scope.pathObjects = {};
        $scope.selectedPath = false;
        $scope.goToPath = function(index) {
            $scope.$parent.map.fitBounds($scope.pathObjects[index].getBounds(), { padding: [20, 20] });
            $scope.selectedPath = index;
        }
        $scope.onFileSelect = function($files) {
            removePaths();
            $scope.filestatus = "Processing file";
            $scope.upload = [];
            for (var i = 0; i < $files.length; i++) {
                $scope.upload[i] = $upload.upload({
                    url: '/upload/run',
                    data: { },
                    file: $files[i]
                }).then(function(response) {
                    console.log(response);
                    $scope.filestatus = "";
                    $scope.paths = response.data.geo_json;
                    $scope.pathObjects = []
                    _.each($scope.paths, function(path) {
                        $scope.pathObjects.push(new L.geoJson(path, {
                            color: 'black',
                            weight: 10,
                            opacity: 0.5
                        }).addTo($scope.$parent.map));
                    });
                    $scope.object.gpx_file = {
                        size: response.config.file.size,
                        fileName: response.config.file.name,
                        lastModified: response.config.file.lastModifiedDate
                    }
                    if ($scope.paths.length == 1) {
                        $scope.selectedPath = 1;
                    }
                }, function(err) {
                    console.log('Error uploading: ' + err);
                    $scope.filestatus('Error with files');
                }, function(e) {
                    console.log('percent: ' + parseInt(100.0 * e.loaded / e.total));
                });
            }
        }
        $scope.createRun = function() {
            if (!$scope.selectedPath) {
                $scope.object.loc = $scope.paths[$scope.selectedPath].geometry;
                $http.post('/api/runs', $scope.object)
                    .success(function(data) {
                        removePaths();
                        $scope.$parent.runs.push(data);
                        riverMethods.setUpRun($scope.$parent, data);
                        console.log(data);
                        $location.path('/detail/run/' + data._id);
                    })
                    .error(function(data) {
                        console.log('Error: ' + data);
                    });
            } else {
                alert('Select a path by clicking on it');
            }
        };
        $scope.$on('$destroy', removePaths);
        function removePaths() {
            _.each($scope.pathObjects, function(p) {
                $scope.$parent.map.removeLayer(p);
            });
            $scope.pathObjects = [];
        }
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
        riverMethods.resourceQuery($scope, 'river')
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
            if ($routeParams.hasOwnProperty('lat')) {
                // do nothing here
                //$scope.$parent.map.setView([$routeParams.lat, $routeParams.lng], $routeParams.zoom);
            } else if ($scope.object.hasOwnProperty('marker')) {
                $scope.$parent.map.setZoom(zoom).panTo([$scope.object.marker.lat, $scope.object.marker.lng])
            } else if ($scope.object.hasOwnProperty('path')) {
                $scope.$parent.map.fitBounds($scope.object.path.getBounds(), { padding: [20, 20] });
            } else {
                if ($scope.object.hasOwnProperty('loc') && $scope.object.loc.type == "Point") {
                    $scope.$parent.map.setZoom(zoom).panTo([$scope.object.loc.coordinates[1], $scope.object.loc.coordinates[0]])
                }
                switch ($scope.type) {
                    case 'rapid':
                        riverMethods.setUpRapid($scope.$parent, $scope.object, $route.reload);
                        break;
                    case 'river':
                        // get all river stuff
                        $scope.object_runs = _.findWhere($scope.$parent.runs, {river: $scope.id});
                        break;
                    case 'gauge':
                        riverMethods.getFullGauge($scope.$parent, $scope.object, $route.reload);
                        break;
                }
            }
            switch ($scope.type) {
                case 'run':
                    console.log($scope.object);
                    if ($scope.object.hasOwnProperty('gauge')) {
                        $scope.object_gauge = _.findWhere($scope.$parent.gauges, {_id: $scope.object.gauge });
                    }
                    break;
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
                                riverMethods.setUpRun($scope.$parent, $scope.object, $route.reload);
                                break;
                            case 'rapid':
                                riverMethods.setUpRapid($scope.$parent, $scope.object, $route.reload);
                                break;
                        }
                    } else {
                        console.log('No such ' + $scope.type);
                    }
                })
                .error(function(data) {
                    console.log('Error loading thing: ' + data);
                });
        }
    }]);
