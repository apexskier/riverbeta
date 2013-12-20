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
app.use(express.static(path.join(__dirname, 'app')));

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
var RunSchema = mongoose.Schema({
    name : String,
    description : String,
    rating : { // class
        high : Number,
        low : Number
    },
    level : {
        units : String,
        high : Number,
        low : Number
    },
    river : { type: ObjectId, ref: 'River' },
    gauge : { type: ObjectId, ref: 'Gauge' },
    gpx_file : {
        size : Number,
        fileName: String,
        lastModified : Date
    },
    loc : {
        'type' : { type: String },
        coordinates : []
    }
});
RunSchema.index({ loc : '2dsphere' });
var Run = mongoose.model('Run', RunSchema);
var RapidSchema = mongoose.Schema({
    name : String,
    description : String,
    rating : Number,
    river : { type: ObjectId, ref: 'River' },
    run : { type: ObjectId, ref: 'Run' },
    loc : {
        'type' : { type: String },
        coordinates : []
    }
});
RapidSchema.index({ loc : '2dsphere' });
var Rapid = mongoose.model('Rapid', RapidSchema);

var map = {
    rivers: River,
    gauges: Gauge,
    runs: Run,
    rapids: Rapid
}

/* * * *
 * API *
 * * * */
app.get('/api/:type/near/:lat/:lng/:dist', function(req, res) {
    map[req.params.type].geoNear({ type: "Point", coordinates: [parseFloat(req.params.lng), parseFloat(req.params.lat)] }, {
        maxDistance: parseFloat(req.params.dist) / 2,
        spherical: true
    }, function(err, things) {
        if (err) {
            res.send(err);
        } else {
            res.json(_.map(things, function(thing) {
                return thing.obj;
            }));
        }
    });
});
app.get('/api/:type/dist/:lat/:lng', function(req, res) {
    map[req.params.type].geoNear({ type: "Point", coordinates: [parseFloat(req.params.lng), parseFloat(req.params.lat)] }, {
        maxDistance: 0.17431959979659852,
        spherical: true
    }, function(err, things) {
        if (err) {
            res.send(err);
        } else {
            res.json(things);
        }
    });
});
app.get('/api/:type', function(req, res) {
    map[req.params.type].find(function(err, things) {
        if (err)
            res.send(err);
        res.json(things);
    });
});
app.get('/api/:type/:id', function(req, res) {
    map[req.params.type].findById(req.params.id, function(err, thing) {
        if (err) {
            res.send(err);
        } else if (!thing) {
            res.status(404).send('Not found');
        } else {
            res.json(thing);
        }
    });
});
app.delete('/api/:type/:id', function(req, res) {
    map[req.params.type].remove({
        _id : req.params.id
    }, function(err, thing) {
        if (err)
            res.send(err);

        map[req.params.type].find(function(err, things) {
            if (err)
                res.send(err);
            res.json(things);
        });
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

app.post('/api/runs', function(req, res) {
    var gpxPath = 'app/uploads/gpx/' + req.body.gpx_file.fileName;
    var geoJson = togeojson.gpx(jsdom(fs.readFileSync(gpxPath, 'utf8')));
    req.body.loc = _.reject(geoJson.features, function(path) {
        return path.geometry.type != 'LineString';
    })[0].geometry;
    if (!!req.body.loc.coordinates.length) {
        Run.create(req.body, function(err, thing) {
            if (err) {
                res.send(err);
            } else {
                res.json(thing);
            }
        });
    }
});
app.put('/api/runs/:id', function (req, res){
    return Run.findById(req.params.id, function (err, thing) {
        thing.name = req.body.name;
        thing.description = req.body.description;
        thing.level = req.body.level;
        thing.river = req.body.river;
        thing.gauge = req.body.gauge;
        return thing.save(function (err) {
            if (!err) {
                console.log("updated");
            } else {
                console.log(err);
            }
            return res.send(thing);
        });
    });
});

app.get('/api/gauges/full/:gauge_id', function(req, res) {
    Gauge.findById(req.params.gauge_id, function(err, gauge) {
        if (err)
            res.send(err);
        if (!gauge) {
            res.status(404).send('Not found');
        }
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
app.put('/api/gauges/:id', function (req, res){
    return Gauge.findById(req.params.id, function (err, thing) {
        thing.name = req.body.name;
        thing.river = req.body.river;
        return thing.save(function (err) {
            if (!err) {
                console.log("updated");
            } else {
                console.log(err);
            }
            return res.send(thing);
        });
    });
});

app.post('/api/rapids', function(req, res) {
    console.log(req.body);
    Rapid.create(req.body, function(err, thing) {
        console.log(thing);
        if (err) {
            res.send(err);
        } else {
            res.json(thing);
        }
    });
});


app.post('/upload/run', function(req, res) {
    var serverPath = 'app/uploads/gpx/' + req.files.file.name
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
    res.sendfile('./app/index.html');
});

http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});
