var http        = require('http'),
    express     = require('express'),
    mongoose    = require('mongoose'),
    path        = require('path'),
    fs          = require('fs'),
    flash       = require('connect-flash'),
    _           = require('underscore'),
    togeojson   = require('togeojson'),
    jsdom       = require('jsdom').jsdom;
    privates    = require('./private.js');

var app = express();

mongoose.connect('mongodb://' + privates.db_user + ':' + privates.db_pass + '@' + privates.db_host + '/' + privates.db)

// app.set('env', process.env.ENV || 'dev');
app.set('port', (process.env.PORT || 8080));
app.set('views', path.join(__dirname, 'views'));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
// app.use(express.session());
// app.use(flash());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'static')));

/* * * * * * * * * *
 * Database Models *
 * * * * * * * * * */
var ObjectId = mongoose.Schema.Types.ObjectId;

var River = mongoose.model('River', {
    name : String,
    size : String
});
var Gauge = mongoose.model('Gauge', {
    code : String,
    source : String,
    river : { type: ObjectId, ref: 'River' }
});
var Run = mongoose.model('Run', {
    name : String,
    rating : { // class
        high : Number,
        low : Number
    },
    level : [{
        units : String,
        high : Number,
        low : Number
    }],
    river : { type: ObjectId, ref: 'River' },
    gauge : { type: ObjectId, ref: 'Gauge' },
    gpx_file : {
        size : Number,
        fileName: String,
        lastModified : Date
    },
    geo_json : { }
});

/* * * *
 * API *
 * * * */
app.get('/api/rivers', function(req, res) {
    River.find(function(err, rivers) {
        if (err)
            res.send(err);
        res.json(rivers);
    });
});
app.post('/api/rivers', function(req, res) {
    River.create({
        name: req.body.name,
        size: req.body.size
    }, function(err, rivers) {
        if (err)
            res.send(err);

        River.find(function(err, river) {
            if (err)
                res.send(err);
            res.json(rivers);
        });
    });
});
app.delete('/api/rivers/:river_id', function(req, res) {
    River.remove({
        _id : req.params.river_id
    }, function(err, river) {
        if (err)
            res.send(err);

        River.find(function(err, rivers) {
            if (err)
                res.send(err);
            res.json(rivers);
        });
    });
});

app.get('/api/runs', function(req, res) {
    Run.find(function(err, runs) {
        if (err)
            res.send(err);
        res.json(runs);
    });
});
app.post('/api/runs', function(req, res) {
    var gpxPath = 'static/uploads/gpx/' + req.body.gpx_file.fileName;
    var geoJson = togeojson.gpx(jsdom(fs.readFileSync(gpxPath, 'utf8')));
    geoJson.features = _.reject(geoJson.features, function(path) {
        return path.geometry.type != 'LineString' && path.geometry.type != 'MultiLineString';
    });
    Run.create({
        name: req.body.name,
        rating: req.body.rating,
        level: [req.body.level],
        river: req.body.river_id,
        gauge: req.body.gauge_id,
        gpx_file: req.body.gpx_file,
        geo_json: geoJson
    }, function(err, run) {
        if (err)
            res.send(err);

        Run.find(function(err, runs) {
            if (err)
                res.send(err);
            res.json(run);
        });
    });
});
app.delete('/api/runs/:run_id', function(req, res) {
    Run.remove({
        _id : req.params.run_id
    }, function(err, run) {
        if (err)
            res.send(err);

        Run.find(function(err, runs) {
            if (err)
                res.send(err);
            res.json(runs);
        });
    });
});

app.get('/api/gauges', function(req, res) {
    Gauge.find(function(err, gauges) {
        if (err)
            res.send(err);
        res.json(gauges);
    });
});
app.get('/api/gauges/:gauge_id', function(req, res) {
    Gauge.findById(req.params.gauge_id, function(err, gauge) {
        if (err)
            res.send(err);
        res.json(gauge);
    });
});
app.get('/api/gauges/full/:gauge_id', function(req, res) {
    Gauge.findById(req.params.gauge_id, function(err, gauge) {
        if (err)
            res.send(err);
        switch (gauge.source) {
            case 'usgs':
                var url = "http://waterservices.usgs.gov/nwis/iv/?sites=" + gauge.code + "&period=P7D&format=json"
                http.get(url, function(httpRes) {
                    var body = '';
                    httpRes.on('data', function(chunk) {
                        body += chunk;
                    });
                    httpRes.on('end', function() {
                        var response = JSON.parse(body);
                        info = {};
                        for (var key in gauge) {
                            if (key in gauge.schema.paths && key != 'toString') {
                                info[key] = _.clone(gauge[key]);
                            }
                        }
                        info.data = {};
                        for (var i in response['value']['timeSeries']) {
                            var item = response['value']['timeSeries'][i];
                            if (!!item['sourceInfo']['siteName']) {
                                info.name = item['sourceInfo']['siteName'].replace(/\w\S*/g, function(txt) {
                                    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                                });
                            }
                            info.geo_lat = parseFloat(item['sourceInfo']['geoLocation']['geogLocation']['latitude']);
                            info.geo_lng = parseFloat(item['sourceInfo']['geoLocation']['geogLocation']['longitude']);
                            var unit = item['variable']['unit']['unitAbbreviation'];
                            switch (unit) {
                                case "ft3/s":
                                    unit = "cfs";
                                    break;
                            }
                            info.data[unit] = {
                                unit: item['variable']['unit']['unitAbbreviation'],
                                unitName: item['variable']['variableName'],
                                unitDesc: item['variable']['variableDescription'],
                                recent: parseFloat(item['values'][0]['value'][item['values'][0]['value'].length - 1]['value']),
                                trend: parseFloat(item['values'][0]['value'][item['values'][0]['value'].length - 1]['value']) - parseFloat(item['values'][0]['value'][item['values'][0]['value'].length - 14]['value']),
                                values: _.reject(_.map(item['values'][0]['value'], function(val) {
                                    return {
                                        datetime: val.dateTime,
                                        val: parseFloat(val.value)
                                    }
                                }), function(v) {
                                    return parseFloat(v.val) == -999999;
                                })
                            }
                        }
                        res.json(info);
                    });
                }).on('error', function(err) {
                    console.log('Error getting gauge data: ', e);
                });
                break;
        }
    });
});
app.post('/api/gauges', function(req, res) {
    Gauge.create({
        code: req.body.code,
        source: req.body.source,
        river: req.body.river_id
    }, function(err, gauges) {
        if (err)
            res.send(err);

        Gauge.find(function(err, gauge) {
            if (err)
                res.send(err);
            res.json(gauges);
        });
    });
});
app.delete('/api/gauges/:gauge_id', function(req, res) {
    Gauge.remove({
        _id : req.params.gauge_id
    }, function(err, gauge) {
        if (err)
            res.send(err);

        Gauge.find(function(err, gauges) {
            if (err)
                res.send(err);
            res.json(gauges);
        });
    });
});


app.post('/upload/run', function(req, res) {
    var serverPath = 'static/uploads/gpx/' + req.files.file.name
    fs.rename(req.files.file.path, serverPath, function(err) {
        if (err) {
            console.log('Error uploading: ' + err);
            return;
        }
        res.send({
            path: serverPath
        });
    });
});

/* * * * * * *
 * Frontend  *
 * * * * * * */
app.get('/', function(req, res) {
    res.sendfile('./static/index.html');
});

http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});
