angular.module('riverServices', [])
    .factory('gaugeMethods', ['$http', function($http) {
        return {
            getFullGauge : getFullGauge,
            gaugeQuery : gaugeQuery,
            setColor : setColor,
            setUpRun : setUpRun
        };
        function gaugeQuery() {
            return 0;
        }
        function getFullGauge($scope, gauge, callback) {
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
                    var current_flow = gauge.data[run.level[0].units].recent;
                    var min_flow = run.level[0].low;
                    var max_flow = run.level[0].high;
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
                console.log('adding path for ' + run._id);
                run.path = new L.geoJson(run.geo_json, {
                    style: 'black',
                    weight: 10,
                    opacity: 0.75
                });
                run.path.addTo($scope.map);
            }
            setColor($scope, run);
        }
}]);
