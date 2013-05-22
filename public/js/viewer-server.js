/* globals _:true,Rickshaw:true */
define(['viewer-common'], function(common) {

	var groups;
	var formatter = common.formatter;

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
				.tag('a',{href:'#server/'+name+'/summary/cpu'}).text(name).gat()
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

		from = from || '1hour';

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

			// Summary 
			servernav
			.tag('li.nav-header').text('by summary').gat();
			['CPU','Network','Disk'].forEach(function(metricsname) {
				var lowername = metricsname.toLowerCase().replace(' ','-');
				servernav
				.tag('li', {'data-type':'summary-' + lowername})
				.tag('a', {href:'#server/'+group+'/summary/'+lowername}).text(metricsname).gat()
				.gat()
				;
			});

			// Metrics
			servernav
			.tag('li.nav-header').text('by metrics').gat();

			['CPU Usage','Load Average','Network','Disk IO','Disk Usage'].forEach(function(metricsname) {
				var lowername = metricsname.toLowerCase().replace(' ','-');
				servernav
				.tag('li', {'data-type':'metrics-' + lowername})
				.tag('a', {href:'#server/'+group+'/metrics/'+lowername}).text(metricsname).gat()
				.gat()
				;
			});
			servernav
			.tag('li.nav-header').text('by servers').gat();

			// Servers
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
					showSummary(group, name, from);
				} else if (type === 'metrics') {
					showMetrics(group, name, from);
				}
			}
		}
	}

	function destroy(callback) {
		callback();
	}

	function showRangeList(hash, from) {
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
				location.hash = hash+'/'+name;
			});
			btngroup.append(button);
			prevrange = range;

		});
		ui.content.append(rangeContainer);
	}

	function showServer(group, server, from) {

		from = from || '1hour';

		ui.content.empty();

		showRangeList('server/' + group + '/server/' + server, from);

		var range = common.ranges[from];

		var cpuContainer = $.tag('.chart.cpu');
		var loadContainer = $.tag('.chart.load');
		//var processContainer = $.tag('.chart.process');
		var systemContainer = $.tag('.chart.system');
		var networkContainer = $.tag('.chart.network');
		var diskContainer = $.tag('.chart.disk');
		var usageContainer = $.tag('.chart.usage');

		addCPUChart({
			title: 'CPU Usage',
			group: group,
			server: server,
			range: range,
			metrics: 'cpu.*',
			container: cpuContainer
		});
		addLoadAverageChart({
			title: 'Load Average',
			group: group,
			server: server,
			range: range,
			metrics: 'load.*',
			container: loadContainer
		});
		addSystemChart({
			title: 'Interrupt / Contet Switch',
			group: group,
			server: server,
			range: range,
			metrics: 'system.*',
			container: systemContainer
		});
		addNetworkChart({
			title: 'Network Traffic',
			group: group,
			server: server,
			range: range,
			metrics: 'net.*.*',
			container: networkContainer
		});
		addDiskChart({
			title: 'Disk I/O',
			group: group,
			server: server,
			range: range,
			metrics: 'disk.*.*',
			container: diskContainer
		});
		addDiskUsageChart({
			title: 'Disk Usage',
			group: group,
			server: server,
			range: range,
			metrics: 'disk.*.usage.*',
			container: usageContainer
		});

		ui.content.append(
			cpuContainer,
			loadContainer,
			systemContainer,
			networkContainer,
			diskContainer,
			usageContainer
		);
	}

	function showSummary(group, type, from) {

		ui.content.empty();

		showRangeList('server/' + group + '/summary/' + type, from);

		var range = common.ranges[from];
		var container;

		if (type === 'cpu') {

			container = $.tag('div.chart.cpu');
			addCPUChart({
				title: 'CPU Usage/Average',
				server: '*',
				group: group,
				metrics: [
					'averageSeries(cpu.idle)',
					'averageSeries(cpu.user)',
					'averageSeries(cpu.system)',
					'averageSeries(cpu.iowait)',
					'averageSeries(cpu.irq)',
					'averageSeries(cpu.nice)',
					'averageSeries(cpu.softirq)',
					'averageSeries(cpu.steal)'
				].join(',')
				,
				range: range,
				container: container
			});
			ui.content.append(container);

			container = $.tag('div.chart.cpu');
			addCPUChart({
				title: 'CPU Usage/Max',
				server: '*',
				group: group,
				metrics: [
					'minSeries(cpu.idle)',
					'maxSeries(cpu.user)',
					'maxSeries(cpu.system)',
					'maxSeries(cpu.iowait)',
					'maxSeries(cpu.irq)',
					'maxSeries(cpu.nice)',
					'maxSeries(cpu.softirq)',
					'maxSeries(cpu.steal)'
				].join(','),
				range: range,
				container: container
			});
			ui.content.append(container);

			container = $.tag('div.chart.load');
			addLoadAverageChart({
				title: 'Load Average/Average',
				server: '*',
				group: group,
				metrics: [
					'averageSeries(load.1m)',
					'averageSeries(load.5m)',
					'averageSeries(load.15m)'
				].join(','),
				calculate: 'averageSeries',
				range: range,
				container: container
			});
			ui.content.append(container);

			container = $.tag('div.chart.load');
			addLoadAverageChart({
				title: 'Load Average/Max',
				server: '*',
				group: group,
				metrics: [
					'maxSeries(load.1m)',
					'maxSeries(load.5m)',
					'maxSeries(load.15m)'
				].join(','),
				range: range,
				container: container
			});
			ui.content.append(container);

		} else if (type === 'network') {

			container = $.tag('div.chart.load');
			addNetworkChart({
				title: 'Network/Total',
				server: '*',
				group: group,
				metrics: [
					'sumSeries(net.*.send)',
					'sumSeries(net.*.receive)'
				].join(','),
				range: range,
				container: container
			});
			ui.content.append(container);

			container = $.tag('div.chart.load');
			addNetworkChart({
				title: 'Network/Max',
				server: '*',
				group: group,
				metrics: [
					'maxSeries(net.*.send)',
					'maxSeries(net.*.receive)'
				].join(','),
				range: range,
				container: container
			});
			ui.content.append(container);

		} else if (type === 'disk') {

			container = $.tag('div.chart.disk');
			addDiskChart({
				title: 'Disk IO/Total',
				server: '*',
				group: group,
				metrics: [
					'sumSeries(disk.*.read)',
					'sumSeries(disk.*.write)',
				].join(','),
				range: range,
				container: container
			});
			ui.content.append(container);

			container = $.tag('div.chart.disk');
			addDiskChart({
				title: 'Disk IO/Max',
				server: '*',
				group: group,
				metrics: [
					'maxSeries(disk.*.read)',
					'maxSeries(disk.*.write)',
				].join(','),
				range: range,
				container: container
			});
			ui.content.append(container);

			container = $.tag('div.chart.usage');
			addDiskUsageChart({
				title: 'Disk Usage/Total',
				server: '*',
				group: group,
				metrics: [
					'sumSeries(disk.*.usage.available)',
					'sumSeries(disk.*.usage.used)',
				].join(','),
				range: range,
				container: container
			});
			ui.content.append(container);

			container = $.tag('div.chart.usage');
			addDiskUsageChart({
				title: 'Disk Usage/Max',
				server: '*',
				group: group,
				metrics: [
					'maxSeries(disk.*.usage.available)',
					'minSeries(disk.*.usage.used)',
				].join(','),
				range: range,
				container: container
			});
			ui.content.append(container);

		}

	}

	function showMetrics(group, type, from) {

		ui.content.empty();

		showRangeList('server/' + group + '/metrics/' + type, from);

		var servers = groups[group];
		var range = common.ranges[from];

		servers.forEach(function(server) {
			var container = $.tag('div.chart');
			if (type === 'cpu-usage') {
				addCPUChart({
					title: server,
					server: server,
					group: group,
					metrics: 'cpu.*',
					range: range,
					container: container
				});
			} else if (type === 'load-average') {
				addLoadAverageChart({
					title: server,
					server: server,
					group: group,
					metrics: 'load.*',
					range: range,
					container: container
				});
			} else if (type === 'network') {
				addNetworkChart({
					title: server,
					server: server,
					group: group,
					metrics: 'net.*.*',
					range: range,
					container: container
				});
			} else if (type === 'disk-io') {
				addDiskChart({
					title: server,
					server: server,
					group: group,
					metrics: 'disk.*.*',
					range: range,
					container: container
				});
			} else if (type === 'disk-usage') {
				addDiskUsageChart({
					title: server,
					server: server,
					group: group,
					metrics: 'disk.*.usage.*',
					range: range,
					container: container
				});
			}
			ui.content.append(container);
		});

	}

	function addCPUChart(option) {

		var title = option.title;
		var group = option.group;
		var server = option.server;
		var range = option.range;
		var metrics = option.metrics;
		var container = option.container;
		var calculate = option.calculate;

		var summarize = getSummarize(range.seconds, 'avg');
		var xformat = formatter.date(range.format);
		var xticks = range.ticks;
		var from = range.from;

		container.tag('h4').text(title).gat();

		// cpu charts
		common.api('chart', {
			group: group,
			server: server,
			metrics: metrics,
			summarize: summarize,
			calculate: calculate,
			from: from
		}, function(err, series) {

			if (err) {
				common.error(err);
				return;
			}

			sortSeries(series.cpu, ['idle','nice','steal','softirq','irq','iowait','system','user']);

			createChart({
				title: title,
				renderer: 'area',
				series: series.cpu,
				container: container,
				colors: colors.cpu,
				xformat: xformat,
				xticks: xticks,
				yformat: formatter.percent,
				yticks: 4,
				max: option.max || 100
			});
		});
	}

	function addLoadAverageChart(option) {

		var title = option.title;
		var group = option.group;
		var server = option.server;
		var range = option.range;
		var metrics = option.metrics;
		var container = option.container;

		var summarize = getSummarize(range.seconds, 'avg');
		var xformat = formatter.date(range.format);
		var xticks = range.ticks;

		container.tag('h4').text(title).gat();

		// load average
		common.api('chart', {
			group: group,
			server: server,
			metrics: metrics,
			summarize: summarize,
			from: range.from,
			calculate: option.calculate
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
				renderer: 'line',
				series: series.load,
				container: container,
				colors: colors.load,
				stroke: true,
				xformat: xformat,
				xticks: xticks,
				yformat: formatter.fixed,
				yticks: 4,
				max: max
			});
		});
	}

	function addSystemChart(option) {
		var title = option.title;
		var group = option.group;
		var server = option.server;
		var range = option.range;
		var metrics = option.metrics;
		var container = option.container;

		var summarize = getSummarize(range.seconds, 'avg');
		var xformat = formatter.date(range.format);
		var xticks = range.ticks;

		container.tag('h4').text(title).gat();

		// load average
		common.api('chart', {
			group: group,
			server: server,
			metrics: metrics,
			summarize: summarize,
			from: range.from,
			calculate: option.calculate
		}, function(err, series) {

			if (err) {
				common.error(err);
				return;
			}

			sortSeries(series.system, ['contextsw','interrupt']);

			createChart({
				renderer: 'line',
				series: series.system,
				container: container,
				colors: colors.system,
				stroke: true,
				xformat: xformat,
				xticks: xticks,
				yformat: formatter.fixed,
				yticks: 4
			});
		});
	}

	function addNetworkChart(option) {

		var title = option.title;
		var group = option.group;
		var server = option.server;
		var range = option.range;
		var metrics = option.metrics;
		var container = option.container;

		var summarize = getSummarize(range.seconds, 'avg');
		var xformat = formatter.date(range.format);
		var xticks = range.ticks;

		// running process charts
		// interrupt/contextsw charts
		// network charts
		common.api('chart', {
			group: group,
			server: server,
			metrics: metrics,
			summarize: summarize,
			from: range.from,
			calculate: option.calculate
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

				container.tag('h4').text(title + ' / '+ devname).gat();

				createChart({
					renderer: 'area',
					series: series,
					container: container,
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
	}

	function addDiskChart(option) {

		var title = option.title;
		var group = option.group;
		var server = option.server;
		var range = option.range;
		var metrics = option.metrics;
		var container = option.container;

		var summarize = getSummarize(range.seconds, 'avg');
		var xformat = formatter.date(range.format);
		var xticks = range.ticks;

		// disk charts
		common.api('chart', {
			group: group,
			server: server,
			metrics: metrics,
			summarize: summarize,
			from: range.from,
			calculate: option.calculate
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

				container.tag('h4').text(title + ' / '+ devname).gat();

				createChart({
					renderer: 'area',
					series: series,
					container: container,
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
	}

	function addDiskUsageChart(option) {

		var title = option.title;
		var group = option.group;
		var server = option.server;
		var range = option.range;
		var metrics = option.metrics;
		var container = option.container;

		var summarize = getSummarize(range.seconds, 'avg');
		var xformat = formatter.date(range.format);
		var xticks = range.ticks;

		// disk charts
		common.api('chart', {
			group: group,
			server: server,
			metrics: metrics,
			summarize: summarize,
			from: range.from,
			calculate: option.calculate
		}, function(err, series) {

			if (err) {
				common.error(err);
				return;
			}

			_.each(series.disk, function(series, devname) {
				container.tag('h4').text(title + ' / ' + devname).gat();
				sortSeries(series.usage, ['used','available']);
				createChart({
					renderer: 'area',
					series: series.usage,
					container: container,
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
	}

	/**
	 * Create stacked chart
	 */
	function createChart(opts) {

		var container = opts.container;
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
