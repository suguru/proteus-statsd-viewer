
/**
 * Module dependencies.
 */


var express = require('express')
	, fs = require('fs')
	, http = require('http')
	, path = require('path')
	, program = require('commander')
	, config = require('./lib/config');

program
.option('-p,--port [port]', 'Listening port. default) 8888')
.option('-h,--host [host]', 'Listening host address. default) 0.0.0.0')
.option('-c,--config [config]', 'Path of the config file. default) /etc/proteus-statsd-viewer.json')
.parse(process.argv)
;

var host = program.host || '0.0.0.0';
var port = program.port || 8888;
var configpath = program.config || '/etc/proteus-statsd-viewer.json';

try {
	var content = fs.readFileSync(configpath, { encoding:'utf8' });
	var parsed = JSON.parse(content);
	for (var propname in parsed) {
		config[propname] = parsed[propname];
	}
} catch (e) {
	console.error(e.message);
	process.exit(1);
}


var app = express();

// all environments
app.set('port', port);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
//app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.compress());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
	app.use(express.errorHandler());
}

var router = require('./lib/routes');
router(app);

http.createServer(app).listen(port, host, function(){
	console.log('Express server listening on port ' + port);
});

