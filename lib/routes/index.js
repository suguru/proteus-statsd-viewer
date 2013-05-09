
var graphite = require('../graphite');

function register(app) {


	app.get('/', function(req, res) {
		res.render('index');
	});


	app.post('/api/servers', function(req, res, next) {

		graphite.servers(function(err, data) {

			if (err) {
				next(err);
				return;
			}

			res.json(data);

		});
	});

	app.post('/api/chart', function(req, res, next) {

		graphite.chart(req.body, function(err, data) {

			if (err) {
				next(err);
				return;
			}

			res.json(data);


		});

	});

}

module.exports = register;
