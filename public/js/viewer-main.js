/* global async:true,routie:true */
require(['viewer-common'], function(common) {

	// prepare header
	$('header')
	.tag('.navbar.navbar-fixed-top')
		.tag('.navbar-inner')
			.tag('.container')
				.tag('a.brand', {href:'/'}).text('Statsd Viewer').gat()
				.tag('ul.nav')
					.tag('li').tag('a',{href:'#server'}).text('Servers').gat().gat()
				.gat()
			.gat()
		.gat()
	.gat();

	var current = null;

	function call(modulename, methodname) {
		return function() {
			var args = Array.prototype.slice.apply(arguments);
			require(['viewer-'+modulename], function(module) {

				var series = [];
				var query = {};
				var previous = current;
				var hash = location.hash;

				if (hash.indexOf('?') >= 0) {
					query = $.parseQuery(hash.substring(hash.indexOf('?')+1));
				}
				module.query = query;

				current = module;
				if (previous && current !== previous) {
					series.push(function(done) {
						var destroy = previous.destroy;
						if (destroy) {
							if (destroy.length === 1) {
								destroy.call(previous, done);
							} else {
								destroy.call(previous);
								done();
							}
						} else {
							done();
						}
					});
				}
				if (current !== previous) {
					series.push(function(done) {
						var init = current.init;
						if (init) {
							if (init.length === 1) {
								init.call(current, done);
							} else {
								init.call(current);
								done();
							}
						} else {
							done();
						}
					});
				}
				series.push(function(done) {
					var method = current[methodname];
					if (method) {
						method.apply(current, args);
					} else {
						console.error('method `' + methodname + '` does not exist in `' + modulename + '`');
					}
					done();
				});
				async.series(series, function(err) {
					if (err) {
						common.error(err);
					}
				});
				previous = current;
			});
		};
	}

	routie('server/:group?/:type?/:name?/:from?', call('server', 'show'));
	if (location.hash) {
		routie(location.hash.substring(1));
	}

});

