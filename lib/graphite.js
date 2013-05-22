
var request = require('superagent');
var config = require('./config');
var apiurl = config.graphite.url + 'render';


function api(option, callback) {

	/*
	var query = {
		format: 'json',
		target: option.target,
		from: option.from
	};
	*/

	var query = 'format=json&from='+encodeURIComponent(option.from);
	if (Array.isArray(option.target)) {
		option.target.forEach(function(t) {
			query += '&target='+encodeURIComponent(t);
		});
	} else {
		query += '&target='+encodeURIComponent(option.target);
	}

	request
	.get(apiurl)
	.query(query)
	.end(function(err, res) {

		if (err) {
			return callback(err);
		}

		if (res.status !== 200) {
			return callback(new Error('Graphite API error. status:' + res.status));
		}

		callback(null, res.body);

	});

}

function GraphiteClient() {
}

GraphiteClient.prototype = {

	// get server groups and  host list
	servers: function(callback) {

		api({
			target: 'stats.gauges.server.*.*.cpu.idle',
			from: '-10seconds',
			format: 'json'
		}, function(err, list) {

			if (err) {
				return callback(err);
			}

			var groups = {};

			list.forEach(function(metrics) {
				var target = metrics.target;
				var split = target.split('.');
				var group = split[3];
				var name  = split[4];
				var servers = groups[group];
				if (!servers) {
					servers = groups[group] = [];
				}
				if (servers.indexOf(name) < 0) {
					servers.push(name);
				}
			});

			callback(null, groups);
		});
	},

	// get server chart data
	chart: function(data, callback) {

		var group = data.group || '*';
		var server = data.server || '*';
		var from = data.from || '-1day';
		var summarize = data.summarize;

		var targets = [];

		var calcpattern = /(.+?)\((.+?)\)/;

		data.metrics.split(',').forEach(function(metrics) {

			var calculate = null;
			// parse calculator
			var calcmatch = calcpattern.exec(metrics);
			if (calcmatch) {
				calculate = calcmatch[1];
				metrics = calcmatch[2];
			}

			var target = ['stats.gauges.server',group,server,metrics].join('.');
			if (calculate) {
				target = calculate + '(' + target + ')';
			}
			if (summarize) {
				target = 'summarize(' + target + ', "'+summarize.interval+'", "'+summarize.func+'")';
			}

			targets.push(target);
		});

		api({
			target: targets,
			from: from,
			format: 'json'
		}, function(err, list) {

			if (err) {
				return callback(err);
			}

			//console.log(list);
			var groupmap = {};

			list.forEach(function(column) {

				var target = column.target;
				var match = /stats\.gauges\.server\.(.+?)\.(.+?)\.([^,^\)]+)/.exec(target);

				var group = match[1];
				var server = match[2];
				var metrics = match[3];

				var servermap = groupmap[group] || {};
				groupmap[group] = servermap;

				var metricsmap = servermap[server] || {};
				servermap[server] = metricsmap;

				var pointmap, i;
				metrics = metrics.split('.');
				for (i = 0; i < metrics.length - 1; i++) {
					var metric = metrics[i];
					if (i === metrics.length - 2) {
						pointmap = metricsmap[metric] || [];
						metricsmap[metric] = pointmap;
					} else {
						pointmap = metricsmap[metric] || {};
						metricsmap[metric] = pointmap;
						metricsmap = pointmap;
					}
				}

				var data = [];
				var datapoints = column.datapoints;

				var max = 0;
				var min = 0;

				for (i = 0; i < datapoints.length-1; i++) {
					var datapoint = datapoints[i];
					var x = datapoint[1];
					var y = datapoint[0];
					y = Math.round(y * 100) / 100;
					max = Math.max(y, max);
					min = Math.min(y, min);
					data.push({x: x, y: y});
				}
				pointmap.push({
					data: data,
					name: metrics[metrics.length-1],
					max: max,
					min: min
				});
			});

			function notfound(name) {
				callback(new Error('data not found' + (name ? ' ' + name : '')));
			}

			var result = groupmap;
			if (!result) {
				return notfound();
			}

			if (group) {
				result = result[group];
				if (!result) {
					return notfound();
				}
				if (server) {
					result = result[server];
					if (!result) {
						return notfound();
					}
				}
			}

			callback(err, result);

		});
	}

};

module.exports = new GraphiteClient();
