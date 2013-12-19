angular.module('riverServices', [])
    .factory('riverMethods', ['$http', function($http) {
        return {
            resourceQuery : resourceQuery,
            getFullGauge : getFullGauge,
            setColor : setColor,
            setUpRun : setUpRun,
            setUpRapid : setUpRapid
        };
        function getFullGauge($scope, gauge, callback) {
            console.log(gauge);
            $http.get('/api/gauges/full/' + gauge._id)
                .success(function(full_gauge) {
                    _.extend(gauge, full_gauge);
                    $scope.markers[gauge._id] = {
                        lat: gauge.geo_lat,
                        lng: gauge.geo_lng,
                        message: gauge.name,
                        layer: 'gauges'
                    };
                    gauge.marker = $scope.markers[gauge._id];
                    _.each(_.where($scope.runs, {gauge: gauge._id}), function(run) {
                        setColor($scope, run);
                    });
                    if (typeof callback == 'function') {
                        callback();
                    }
                })
                .error(function(data) {
                    console.log('Error getting gauge ' + gauge._id + ': ' + data);
                });
        }
        function setColor($scope, run) {
            if (run.hasOwnProperty('path')) {
                gauge = _.findWhere($scope.gauges, {_id: run.gauge});
                if (gauge && gauge.hasOwnProperty('data')) {
                    var current_flow = gauge.data[run.level.units].recent;
                    var min_flow = run.level.low;
                    var max_flow = run.level.high;
                    var color = 'black';
                    if (current_flow > min_flow && current_flow < max_flow) {
                        // TODO: try to calculate this on a logarithmic scale eventually.
                        color = 'hsl(' + (current_flow - min_flow) * 140 / (max_flow - min_flow) + ', 100%, 50%)';
                    } else if (current_flow <= min_flow) {
                        color = 'hsl(0, 100%, 50%)';
                    } else if (current_flow >= max_flow) {
                        color = 'hsl(240, 100%, 50%)';
                    }
                    run.path.setStyle({ color: color });
                } else {
                    run.path.setStyle({ color: 'black'});
                }
            }
        }
        function setUpRun($scope, run) {
            if (!run.hasOwnProperty('path')) {
                if (!!run.loc.coordinates.length) {
                    run.path = new L.geoJson(run.loc, {
                        style: 'black',
                        weight: 10,
                        opacity: 0.75
                    })
                    .on('click', function(e) {
                        console.log(e);
                        document.location.href = '/#/detail/run/' + run._id;
                    });
                    run.path.addTo($scope.map);
                }
            }
            setColor($scope, run);
        }
        function setUpRapid($scope, rapid, callback) {
            console.log('adding rapid marker ' + rapid.name)
            $scope.markers[rapid._id] = {
                lat: rapid.loc.coordinates[0],
                lng: rapid.loc.coordinates[1],
                message: rapid.name,
                layer: 'rapids'
            };
            rapid.marker = $scope.markers[rapid._id];
            if (typeof callback == 'function') {
                callback();
            }
        }
        function resourceQuery($scope, type, perItem, callback) {
            var types = type + 's'
            $http.get('/api/' + types)
                .success(function(data) {
                    _.each(data, function(item) {
                        if (!_.where($scope[types], {_id: item._id}).length) {
                            $scope[types].push(item);
                            if (typeof perItem == 'function') {
                                perItem($scope, item);
                            }
                        }
                    });
                    if (typeof callback == 'function') {
                        callback();
                    }
                })
                .error(function(data) {
                    console.log('Error loading ' + types + ': ' + data);
                });
        }
    }])
    .filter('getRiverName', function() {
        return function(id, $scope) {
            var river = _.findWhere($scope.rivers, {_id: id})
            return river.name + ' ' + river.size;
        }
    });
