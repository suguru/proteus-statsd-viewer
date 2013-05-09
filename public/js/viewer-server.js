/* globals _:true,Rickshaw:true */
define(['viewer-common'], function(common) {

	var groups;

	var ui = {};

	function init(callback) {

		if (groups) {
			return callback();
		}

		common.api('servers', function(err, data) {
			if (err) {
				return callback(err);
			}

			groups = data;

			ui.container = $.tag('.container');
			ui.groupnav = $.tag('ul.nav.nav-tabs.server-groups')
			;

			_.each(groups, function(group, name) {

				ui
				.groupnav
				.tag('li', {'data-group':name})
				.tag('a',{href:'#server/'+name}).text(name).gat()
				.gat();

			});

			ui.container
			.append(ui.groupnav);

			$('#main')
			.append(ui.container)
			;

			// render ui

			callback();
		});

	}

	function show(group, type, name, from) {

		$('.servers').remove();

		if (group) {

			$('.server-groups li').removeClass('active');
			$('.server-groups li[data-group='+group+']').addClass('active');

			var row = $.tag('.row.servers');
			var left = $.tag('.span3.server-menu');
			var right = $.tag('.span9.server-content');
			row.append(left).append(right);

			ui.menu = left;
			ui.content = right;

			var servernav = $.tag('ul.nav.nav-list');
			left.append(servernav);

			servernav
			.tag('li.nav-header').text('by summary').gat();

			/*
			['CPU','Disk','Network'].forEach(function(metricsname) {
				var lowername = metricsname.toLowerCase();
				servernav
				.tag('li', {'data-type':'summary-' + lowername})
				.tag('a', {href:'#server/'+group+'/summary/'+lowername}).text(metricsname).gat()
				.gat()
				;
			});
			*/

			servernav
			.tag('li.nav-header').text('by metrics').gat();

			servernav
			.tag('li.nav-header').text('by servers').gat();

			groups[group].forEach(function(servername) {
				servernav
				.tag('li', {'data-type':'server-'+servername})
				.tag('a', {href:'#server/'+group+'/server/'+servername}).text(servername).gat()
				.gat();
			});
			left.tag('.well').append(servernav).gat();

			ui.container.append(row);

			if (type && name) {

				$('.server-menu li[data-type='+type+'-'+name+']').addClass('active');

				if (type === 'server') {
					showServer(group, name, from);
				} else if (type === 'summary') {
					showSummary(name);
				} else if (type === 'metrics') {
					showMetrics(name);
				}
			}
		}
	}

	function destroy(callback) {
		callback();
	}

	function showServer(group, server, from) {

		from = from || '1hour';

		ui.content.empty();

		var rangeContainer = $.tag('.range-selector');
		var rangeList = $.tag('div.group.range-selector-list');
		rangeContainer.append(rangeList);

		var prevrange = {};
		var btngroup;
		_.each(common.ranges, function(range, name) {

			if (range.group !== prevrange.group) {
				btngroup = $.tag('div.btn-group');
				rangeList.append(btngroup);
			}

			var button = $.tag('button.btn.btn-small')
			.attr('data-from', name)
			.text(name)
			;

			if (name === from) {
				button.addClass('active btn-success');
			}
			button.click(function() {
				location.hash = 'server/'+group+'/server/'+server+'/'+name;
			});
			btngroup.append(button);
			prevrange = range;

		});

		var range = common.ranges[from];
		from = range.from;

		var summarize = getSummarize(range.seconds, 'avg');
		var xformat = formatter.date(range.format);
		var xticks = range.ticks;

		var cpuContainer = $.tag('.chart.cpu');
		var loadContainer = $.tag('.chart.load');
		//var processContainer = $.tag('.chart.process');
		var systemContainer = $.tag('.chart.system');
		var networkContainer = $.tag('.chart.network');
		var diskContainer = $.tag('.chart.disk');
		var usageContainer = $.tag('.chart.usage');

		// cpu charts
		common.api('chart', {
			group: group,
			server: server,
			metrics: 'cpu.*',
			summarize: summarize,
			from: from
		}, function(err, series) {

			if (err) {
				common.error(err);
				return;
			}

			sortSeries(series.cpu, ['idle','nice','steal','softirq','irq','iowait','system','user']);

			createChart({
				title: 'CPU Usage',
				renderer: 'area',
				series: series.cpu,
				container: cpuContainer,
				colors: colors.cpu,
				xformat: xformat,
				xticks: xticks,
				yformat: formatter.percent,
				yticks: 4
			});

		});
		// load average
		common.api('chart', {
			group: group,
			server: server,
			metrics: 'load.*',
			summarize: summarize,
			from: range.from
		}, function(err, series) {

			if (err) {
				common.error(err);
				return;
			}

			sortSeries(series.load, ['1m', '5m', '15m']);

			var max = Math.ceil(Math.max(
				series.load[0].max,
				series.load[1].max,
				series.load[2].max
			));

			createChart({
				title: 'Load Average',
				renderer: 'line',
				series: series.load,
				container: loadContainer,
				colors: colors.load,
				stroke: true,
				xformat: xformat,
				xticks: xticks,
				yformat: formatter.fixed,
				yticks: 4,
				max: max
			});
		});

		// system contextsw/interrupt
		common.api('chart', {
			group: group,
			server: server,
			metrics: 'system.*',
			summarize: summarize,
			from: range.from
		}, function(err, series) {

			if (err) {
				common.error(err);
				return;
			}

			sortSeries(series.system, ['interrupt','contextsw']);

			createChart({
				title: 'Interrupts and Context Switch',
				renderer: 'line',
				series: series.system,
				container: systemContainer,
				//colors: colors.load,
				stroke: true,
				xformat: xformat,
				xticks: xticks,
				yformat: function(y) {
					return formatter.round(y/10);
				},
				yticks: 4
			});
		});

		// running process charts
		// interrupt/contextsw charts
		// network charts
		common.api('chart', {
			group: group,
			server: server,
			metrics: 'net.*.*',
			summarize: summarize,
			from: from
		}, function(err, series) {

			if (err) {
				common.error(err);
				return;
			}

			_.each(series.net, function(series, devname) {

				if (devname === 'lo') {
					return;
				}

				sortSeries(series, ['send','receive']);

				series[0].data.forEach(function(data) {
					data.y = -data.y;
				});
				var max = Math.max(series[0].max, series[1].max);
				var min = -max;

				createChart({
					title: 'Network Traffic `' + devname + '`',
					renderer: 'area',
					series: series,
					container: networkContainer,
					colors: colors.net,
					stroke: true,
					xformat: xformat,
					xticks: xticks,
					yformat: formatter.byte({abs:true,sector:0.1}), // to be per sec
					hformat: formatter.bytedetail({abs:true,sector:0.1}),
					yticks: 8,
					max: max,
					min: min
				});
			});
		});

		// disk charts
		common.api('chart', {
			group: group,
			server: server,
			metrics: 'disk.*.*',
			summarize: summarize,
			from: from
		}, function(err, series) {

			if (err) {
				common.error(err);
				return;
			}

			_.each(series.disk, function(series, devname) {

				sortSeries(series, ['write','read']);

				series[0].data.forEach(function(data) {
					data.y = -data.y;
				});
				var max = Math.max(series[0].max, series[1].max);
				var min = -max;

				createChart({
					title: 'Disk IO `' + devname + '`',
					renderer: 'area',
					series: series,
					container: diskContainer,
					colors: colors.disk,
					stroke: true,
					xformat: xformat,
					xticks: xticks,
					yformat: formatter.byte({abs:true,sector:4096/10}), // to be per sec
					hformat: formatter.bytedetail({abs:true,sector:4096/10}),
					yticks: 8,
					max: max,
					min: min
				});
			});
		});

		// disk charts
		common.api('chart', {
			group: group,
			server: server,
			metrics: 'disk.*.usage.*',
			summarize: summarize,
			from: from
		}, function(err, series) {

			if (err) {
				common.error(err);
				return;
			}

			_.each(series.disk, function(series, devname) {
				sortSeries(series.usage, ['used','available']);
				createChart({
					title: 'Disk Usage `' + devname + '`',
					renderer: 'area',
					series: series.usage,
					container: usageContainer,
					colors: colors.usage,
					stroke: false,
					xformat: xformat,
					xticks: xticks,
					yformat: formatter.byte({sector:1024}),
					hformat: formatter.bytedetail({sector:1024}),
					yticks: 8
				});
			});
		});

		ui.content.append(
			rangeContainer,
			cpuContainer,
			loadContainer,
			systemContainer,
			networkContainer,
			diskContainer,
			usageContainer
		);
	}

	function showSummary(type) {
	}

	function showMetrics(type) {
	}

	/**
	 * Create stacked chart
	 */
	function createChart(opts) {

		var container = opts.container;
		// title
		container.tag('h4').text(opts.title).gat();
		// container
		var ydiv = $.tag('.yaxis');
		var chartdiv = $.tag('.chart-container');
		var legenddiv = $.tag('.legend-container');
		var xdiv = $.tag('.xaxis');

		container.append(
			ydiv,
			chartdiv,
			legenddiv,
			xdiv
		);

		var colors = opts.colors;

		var series = opts.series;
		if (colors) {
			series.forEach(function(row) {
				row.color = colors[row.name];
			});
		} else {
			var palette  = new Rickshaw.Color.Palette();
			series.forEach(function(row, i) {
				row.color = palette.color(i);
			});
		}
		var graph = new Rickshaw.Graph({
			element: chartdiv.get(0),
			renderer: opts.renderer,
			max: opts.max,
			min: opts.min,
			stroke: opts.stroke || false,
			series: series,
			padding: { top: 0, bottom: 0 }
		});
		graph.render();

		var legend = new Rickshaw.Graph.Legend({
			graph: graph,
			series: series,
			element: legenddiv.get(0)
		});

		new Rickshaw.Graph.Behavior.Series.Toggle({
			graph: graph,
			legend: legend
		});

		new Rickshaw.Graph.Behavior.Series.Highlight({
			graph: graph,
			legend: legend
		});

		new Rickshaw.Graph.HoverDetail({
			graph: graph,
			xFormatter: formatter.date('yyyy-mm-dd HH:MM:ss'),
			yFormatter: opts.hformat || opts.yformat
		});

		var xAxis = new Rickshaw.Graph.Axis.X({
			graph: graph,
			ticks: opts.xticks || 10,
			tickFormat: opts.xformat || formatter.date('HH:MM'),
			element: xdiv.get(0),
			orientation: 'bottom'
		});
		xAxis.render();

		var yAxis = new Rickshaw.Graph.Axis.Y({
			graph: graph,
			element: ydiv.get(0),
			orientation: 'left',
			ticks: opts.yticks || 4,
			tickFormat: opts.yformat
		});
		yAxis.render();

		return graph;
	}

	var getSummarize = function(seconds, func) {

		func = func || 'avg';

		var summarize = function(interval) {
			return {
				interval: interval,
				func: func
			};
		};

		// 1 hour
		if (seconds <= 3600) {
			return;
		}
		// 8 hour
		if (seconds <= 3600*4) {
			return summarize('1minute');
		}
		// 24 hour
		if (seconds <= 86400) {
			return summarize('5minutes');
		}
		// 7 days
		if (seconds <= 86400*7) {
			return summarize('1hour');
		}
		// 30 days
		if (seconds <= 86400*30) {
			return summarize('4hours');
		}
		// 90 days
		if (seconds <= 86400*90) {
			return summarize('8hours');
		}
		// 6 month
		if (seconds <= 86400*180) {
			return summarize('1day');
		}
		// 1 year
		return summarize('2day');
	};

	var colors = {
		cpu: {
			idle: '#39b249',
			user: '#ff8000',
			iowait: '#d93600',
			system: '#b28500',
			irq: '#a64dff',
			nice: '#79b8ff',
			softirq: '#7373ff'
		},
		load: {
			'1m': '#fbba67',
			'5m': '#ff8000',
			'15m': '#ad5b00'
		},
		disk: {
			'read': '#a3d900',
			'write': '#ff9326'
		},
		net: {
			'receive': '#79b8ff',
			'send': '#a64dff'
		},
		usage: {
			'used': '#ac3100',
			'available': '#00b22d'
		}
	};

	var formatter = {
		date: function(format) {
			return function(x) {
				return new Date(x*1000).format(format);
			};
		},
		percent: function(y) {
			if (y === 0) {
				return '';
			} else {
				return y + '%';
			}
		},
		round: function(y) {
			if (y === 0) {
				return '';
			} else {
				return Math.round(y);
			}
		},
		fixed: function(y) {
			if (y === 0) {
				return '';
			} else {
				return Math.round(y*100)/100;
			}
		},
		byte: function(option) {
			option = option || {};
			return function(y) {
				if (option.abs) {
					y = Math.abs(y);
				}
				if (option.sector) {
					y *= option.sector;
				}
				y = Math.round(y);
				var yy = Math.abs(y);
				if (yy === 0) {
					return '';
				}
				if (yy < 1024) {
					return y + 'B';
				}
				if (yy < 1024*1024) {
					return Math.round(y/1024) + 'K';
				}
				if (yy < 1024*1024*1024) {
					return Math.round(y/1024/1024) + 'M';
				}
				if (yy < 1024*1024*1024*1024) {
					return Math.round(y/1024/1024/1024) + 'G';
				}
				if (yy < 1024*1024*1024*1024*1024) {
					return Math.round(y/1024/1024/1024/1024) + 'T';
				}
			};
		},
		bytedetail: function(option) {
			option = option || {};
			return function(y) {
				if (option.abs) {
					y = Math.abs(y);
				}
				if  (option.sector) {
					y *= option.sector;
				}
				var yy = Math.abs(y);
				if (yy === 0) {
					return '';
				}
				if (yy < 1024) {
					return y + 'B';
				}
				if (yy < 1024*1024) {
					return Math.round(y/1024*100)/100 + 'K';
				}
				if (yy < 1024*1024*1024) {
					return Math.round(y/1024/1024*100)/100 + 'M';
				}
				if (yy < 1024*1024*1024*1024) {
					return Math.round(y/1024/1024/1024*100)/100 + 'G';
				}
				if (yy < 1024*1024*1024*1024*1024) {
					return Math.round(y/1024/1024/1024/1024*100)/100 + 'T';
				}
			};
		}
	};

	function sortSeries(series, order) {
		series.sort(function(a, b) {
			var aval = order.indexOf(a.name);
			var bval = order.indexOf(b.name);
			return aval - bval;
		});
	}

	return {

		init: init,
		destroy: destroy,
		show: show

	};

});
