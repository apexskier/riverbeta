var http        = require('http'),
    express     = require('express'),
    mongoose    = require('mongoose'),
    path        = require('path'),
    fs          = require('fs'),
    flash       = require('connect-flash'),
    _           = require('underscore'),
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
        path : String,
        lastModified : Date
    }
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
    Run.create({
        name: req.body.name,
        rating: req.body.rating,
        level: [req.body.level],
        river: req.body.river_id,
        gauge: req.body.gauge_id,
        gpx_file: req.body.gpx_file
    }, function(err, runs) {
        if (err)
            res.send(err);

        Run.find(function(err, run) {
            if (err)
                res.send(err);
            res.json(runs);
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
