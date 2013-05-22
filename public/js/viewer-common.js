
define([], function() {

	(function($) {
		/**
		 * jQuery Tag Extension
		 */
		$.tag = function(name, attrs) {
			var id;
			if (name.indexOf('#') >= 0) {
				id = name.substring(name.indexOf('#')+1);
				name = name.substring(0, name.indexOf('#'));
			}
			var classes;
			if (name.indexOf('.') >= 0) {
				classes = name.substring(name.indexOf('.')+1).split('.');
				name = name.substring(0, name.indexOf('.'));
			}
			name = name || 'div';
			var element = $(document.createElement(name));
			if (id) {
				element.attr('id',id);
			}
			if (classes) {
				element.addClass(classes.join(' '));
			}
			if (attrs) {
				for (var aname in attrs) {
					element.attr(aname, attrs[aname]);
				}
			}
			return element;
		};
		$.fn.tag = function(name, attrs) {
			var self = this;
			var elem = $.tag(name);
			if (attrs) {
				for (var n in attrs) {
					var v = attrs[n];
					elem.attr(n,v);
				}
			}
			return self.pushStack(elem);
		};
		$.fn.gat = function() {
			var self = this;
			return self.end().append(self);
		};
	})(jQuery);

	(function($) {
		var formats = {
			yyyy: function(date) {
				return padZero(date.getFullYear(), 4);
			},
			MM: function(date) {
				return padZero(date.getMonth()+1);
			},
			dd: function(date) {
				return padZero(date.getDate());
			},
			HH: function(date) {
				return padZero(date.getHours());
			},
			mm: function(date) {
				return padZero(date.getMinutes());
			},
			ss: function(date) {
				return padZero(date.getSeconds());
			}
		};
		function padZero(text, num) {
			text = String(text);
			num = num === undefined ? 2 : num;
			while (text.length < num) {
				text = '0' + text;
			}
			return text;
		}
		$.dateformat = function(date, format) {
			format = format || 'yyyy-MM-dd HH:mm';
			if (!(date instanceof Date)) {
				date = new Date(date);
			}
			for (var key in formats) {
				if (format.indexOf(key) >= 0) {
					format = format.replace(key, formats[key](date));
				}
			}
			return format;
		};
	})(jQuery);

	(function($) {
		var re = /([^&=]+)=?([^&]*)/g;
		var decode = function(str) {
			return decodeURIComponent(str.replace(/\+/g, ' '));
		};
		$.parseQuery = function(query) {
			var params = {}, e;
			if (query) {
				if (query.substr(0, 1) === '?') {
					query = query.substr(1);
				}

				while (e = re.exec(query)) {
					var k = decode(e[1]);
					var v = decode(e[2]);
					if (params[k] !== undefined) {
						if (!$.isArray(params[k])) {
							params[k] = [params[k]];
						}
						params[k].push(v);
					} else {
						params[k] = v;
					}
				}
			}
			return params;
		};
	})(jQuery);


	/*
	 * Date Format 1.2.3
	 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
	 * MIT license
	 *
	 * Includes enhancements by Scott Trenda <scott.trenda.net>
	 * and Kris Kowal <cixar.com/~kris.kowal/>
	 *
	 * Accepts a date, a mask, or a date and a mask.
	 * Returns a formatted version of the given date.
	 * The date defaults to the current date/time.
	 * The mask defaults to dateFormat.masks.default.
	 */

	var dateFormat = (function () {
		var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

		// Regexes and supporting functions are cached through closure
		return function (date, mask, utc) {

			// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
			if (arguments.length === 1 && Object.prototype.toString.call(date) === "[object String]" && !/\d/.test(date)) {
				mask = date;
				date = undefined;
			}

			// Passing date through Date applies Date.parse, if necessary
			date = date ? new Date(date) : new Date();
			if (isNaN(date)) throw SyntaxError("invalid date");

			// Allow setting the utc argument via the mask
			if (mask.slice(0, 4) === "UTC:") {
				mask = mask.slice(4);
				utc = true;
			}

			var	_ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				m:    m + 1,
				mm:   pad(m + 1),
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 !== 10) * d % 10]
			};

			return mask.replace(token, function ($0) {
				return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
			});
		};
	})();

	// For convenience...
	Date.prototype.format = function (mask, utc) {
		return dateFormat(this, mask, utc);
	};

	var ranges = {
		'10min': {
			seconds: 360,
			from: '-10min',
			format: 'HH:MM',
			group: 'hour'
		},

		'1hour': {
			seconds: 3600,
			from: '-1hour',
			format: 'HH:MM',
			group: 'hour'
		},

		'4hour': {
			seconds: 3600*4,
			from: '-4hours',
			format: 'HH:MM',
			group: 'hour'
		},

		'12hour': {
			seconds: 3600*12,
			from: '-12hours',
			group: 'hour',
			format: 'HH:MM'
		},

		'1day': {
			seconds: 86400,
			from: '-1day',
			group: 'day',
			format: 'HH:MM'
		},
		'3days': {
			seconds: 86400*3,
			from: '-3days',
			group: 'day',
			format: 'mm-dd HH:MM',
			ticks: 5
		},
		'1week': {
			seconds: 86400*7,
			from: '-7days',
			group: 'day',
			format: 'mm-dd',
			ticks: 7
		},
		'2weeks': {
			seconds: 86400*14,
			from: '-14days',
			group: 'day',
			format: 'mm-dd',
			ticks: 7
		},
		'1month': {
			seconds: 86400*30,
			from: '-1month',
			group: 'month',
			format: 'mm-dd',
			ticks: 10
		},
		'3month': {
			seconds: 86400*90,
			from: '-3month',
			group: 'month',
			format: 'mm-dd',
			ticks: 10
		},
		'6month': {
			seconds: 86400*180,
			from: '-6month',
			group: 'month',
			format: 'mm-dd',
			ticks: 10
		},
		'1year': {
			seconds: 86400*365,
			from: '-1year',
			group: 'month',
			format: 'mm-dd',
			ticks: 10
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

	function error(err) {
		throw err;
	}

	return {
		api: function(path, params, callback) {
			if (typeof params === 'function') {
				callback = params;
				params = undefined;
			}
			path = '/api/' + path;
			$.ajax(path, {

				method: 'post',
				data: params,
				dataType: 'json',
				success: function(data) {
					callback(null, data);
				},
				error: function(req, status, message) {
					callback(new Error(message));
				}

			});
		},
		formatter: formatter,
		ranges: ranges,
		error: error
	};
});
