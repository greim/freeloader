/*
FREELOADER: declarative pre-processing and library loading
Version: 1.0
Copyright: 2010 by Greg Reimer (http://github.com/greim)
License: MIT
*/

(function(w/*indow*/,d/*ocument*/){

	// ###########################################################################
	// API TO "POUNCE" ON DOM ELEMENTS AS SOON AS THEY APPEAR

	// determine if element is done being parsed into dom
	// avoids a race condition
	var doneLoading = (function() {
		var loaded = false,
			setLoaded = function(){loaded = true;};
		if (d.addEventListener) {
			d.addEventListener('load', setLoaded, false);
			d.addEventListener('DOMContentLoaded', setLoaded, false);
		} else if (d.attachEvent) {
			d.attachEvent('onload', setLoaded);
		}
		var rspatt = /^(loaded)|(complete)$/;
		return function(elmt) {
			if (loaded || rspatt.test(d.readyState)) { return true; }
			while (elmt) {
				if (elmt.nextSibling) { return true; }
				elmt = elmt.parentNode;
			}
			return false;
		};
	})();

	// return a random string of hex digits
	var getUtag = (function() {
		var hex = '0123456789abcdef';
		return function() {
			var result = '';
			for (var i=0; i<8; i++) {
				result += hex.charAt(Math.floor(Math.random() * hex.length));
			}
			return result;
		};
	})();

	// has class name?
	var hasClass = (function(){
		var patts={};// cache compiled classname regexps
		return function(el, cName) {
			if (!patts[cName]) { patts[cName] = new RegExp("(^|\\s)"+cName+"($|\\s)"); }
			return el.className && patts[cName].test(el.className);
		};
	})();

	// helper function to save typing
	function process(elmt, utag, cback) {
		if (
			elmt
			&& doneLoading(elmt)
			&& !elmt[utag]
			&& !hasClass(elmt,utag)
		) {
			elmt[utag] = true;
			cback.call(elmt, utag);
		}
	}

	// functions in queue will run periodically
	var queue = [];

	// tracker for ids
	var trackId = (function(){
		var tracked = [];
		var tracking = false;
		function beTracking() {
			if (tracking) { return; }
			tracking = true;
			var stack = [];
			queue.push(function(){
				for (var i=0; i<tracked.length; i++) {
					// does doing this have adverse effects? would it be better
					// to assume/enforce only one element of a given id on a page?
					var elmt;
					while (elmt = d.getElementById(tracked[i].id)) {
						process(elmt, tracked[i].utag, tracked[i].cback);
						elmt.id='';
						stack.push(elmt);
					}
					while (stack.length) {
						stack.pop().id = tracked[i].id;
					}
				}
			});
		}
		return function(id, utag, cback) {
			beTracking();
			tracked.push({
				id: id,
				utag: utag,
				cback: cback
			});
		};
	})();

	// tracker for classes
	var trackClassName = (function(){
		var tracked = [];
		var tracking = false;
		function beTracking() {
			if (tracking) { return; }
			tracking = true;
			queue.push(function(){
				for (var i=0; i<tracked.length; i++) {
					for (var j=0; j<tracked[i].list.length; j++) {
						var elmt = tracked[i].list[j];
						process(elmt, tracked[i].utag, tracked[i].cback);
					}
				}
			});
		}
		return function(cn, utag, cback) {
			beTracking();
			tracked.push({
				list: d.getElementsByClassName(cn),
				utag: utag,
				cback: cback
			});
		};
	})();

	// tracker for CSS query selectors
	var trackQuerySelector = (function(){
		var tracked = [];
		var tracking = false;
		function beTracking() {
			if (tracking) { return; }
			tracking = true;
			queue.push(function(){
				for (var i=0; i<tracked.length; i++) {
					var elmts = d.querySelectorAll(tracked[i].selector);
					for (var j=0; j<elmts.length; j++) {
						process(elmts[j], tracked[i].utag, tracked[i].cback);
					}
				}
			});
		}
		return function(sel, utag, cback) {
			beTracking();
			tracked.push({
				selector: sel,
				utag: utag,
				cback: cback
			});
		};
	})();

	// tracker for classes for old browsers
	var oldTrackClassName = (function(){
		if (d.getElementsByClassName) { return; }
		function crawl(elmt, visit){
			visit(elmt);
			for (var i=0; i<elmt.childNodes.length; i++) {
				var child = elmt.childNodes[i];
				if (child.nodeType === 1) {
					crawl(child, visit);
				}
			}
		}
		var tracked = [];
		var tracking = false;
		function beTracking() {
			if (tracking) { return; }
			tracking = true;
			queue.push(function(){
				crawl(d.documentElement, function(elmt){
					for (var i=0; i<tracked.length; i++) {
						if (tracked[i].clPatt.test(elmt.className)) {
							process(elmt, tracked[i].utag, tracked[i].cback);
						}
					}
				});
			});
		}
		return function(clName, utag, cback) {
			beTracking();
			tracked.push({
				clPatt: new RegExp("(^|\\s)"+clName+"($|\\s)"),
				utag: utag,
				cback: cback
			});
		};
	})();

	// pounce on ids when they occur
	function onElementLoadById(id, cback){
		var utag = getUtag();
		trackId(id, utag, cback);
	}

	// pounce on classes when they occur
	var onElementLoadByClass = (function(){
		var clpatt = /^[0-9a-z_-]+$/i;
		return function(clName, cback){
			if (!clpatt.test(clName)) { throw new Error('invalid className: '+clName); }
			var utag = getUtag();
			if (d.getElementsByClassName) {
				// modern browsers make our lives easier
				trackClassName(clName, utag, cback);
			} else if (d.querySelectorAll) {
				// IE8 does qsa but not gebcn
				trackQuerySelector('.'+clName, utag, cback);
			} else {
				// old browsers make our lives more difficult
				oldTrackClassName(clName, utag, cback);
			}
		};
	})();

	// start the queue cycling
	var pause = 50, // pause in milliseconds between cycles
		counter = 0,
		average = 0, // avg ms for each cycle
		maxAvg = 5;
	(function(){
		var start = new Date();
		if (queue.length) {
			var f = queue.shift();
			f();
			queue.push(f);
		}
		// if this soaks up more than 10% of cpu cycles, throttle it back
		var end = new Date();
		var time = end.getTime() - start.getTime();
		var num = Math.min(maxAvg, counter);
		average = ((average * num) + time) / (num+1);
		if (counter > maxAvg && average / pause > 0.1) {
			pause = Math.round(pause * 1.1);
			//console.log('increasing pause to '+pause);
		}
		counter++;
		w.setTimeout(arguments.callee, pause);
	})();

	// ###########################################################################
	// API TO LOAD LIBRARIES IN ORDER OF DEPENDENCY

	// resolve urls using client's native resolver
	var resolveUrl = (function(){
		var link = d.createElement('a');
		return function(url) {
			link.href = url;
			return link.href;
		};
	})();

	// do two urls, once resolved, match?
	function urlMatches(a,b){
		return resolveUrl(a) === resolveUrl(b);
	}

	// gets just the filename extension of a url
	function getExt(url) {
		return url.replace(/.*?(\.[a-z]+)?([?#].*)?$/,'$1');
	}

	// determine if a url points to js or css file
	var jsPatts = [];
	var cssPatts = [];
	function isJs(url) {
		for (var i=0; i<jsPatts.length; i++) {
			if (jsPatts[i].test(url)) { return true; }
		}
		return getExt(url) === '.js';
	}
	function isCss(url) {
		for (var i=0; i<cssPatts.length; i++) {
			if (cssPatts[i].test(url)) { return true; }
		}
		return getExt(url) === '.css';
	}

	// req[url] = arrayOfPrerequisiteUrls
	var reqs = {};

	// declare a url (js or css) to depend on another list of urls
	function declareReqs(/*requir*/er, /*requir*/ees){
		if (!(ees instanceof Array)) {
			ees = [ees];
		}
		if (!reqs.hasOwnProperty(er)) {
			reqs[er] = [];
		}
		for (var i=0; i<ees.length; i++) {
			reqs[er].push(ees[i]);
		}
	}

	// get a list of urls that are required for a given one
	// first entry of list should be loaded first, etc.
	function getReqs(url, list, decirc){
		list = list || [];
		if (url instanceof Array) {
			while (url.length) {
				getReqs(url.shift(), list);
			}
			return list;
		}
		decirc = decirc || {};
		decirc[url] = true;
		if (reqs.hasOwnProperty(url)) {
			for (var i=0; i<reqs[url].length; i++) {
				var u = reqs[url][i];
				if (decirc.hasOwnProperty(u)) { continue; }
				getReqs(u, list, decirc);
			}
		}
		list.push(url);
		return list;
	}

	// find which js and css files are already on the page
	var isLoaded = (function(){
		var scripts = d.getElementsByTagName('script');
		var links = d.getElementsByTagName('link');
		return function(url) {
			if (isCss(url)) {
				for (var i=0; i<links.length; i++) {
					if (links[i].rel === 'stylesheet' && links[i].href) {
						if (urlMatches(url, links[i].href)) { return true; }
					}
				}
			} else if (isJs(url)) {
				for (var i=0; i<scripts.length; i++) {
					if (scripts[i].src) {
						if (urlMatches(url, scripts[i].src)) { return true; }
					}
				}
			}
			return false;
		};
	})();

	// loads a list of js and css files in order
	// js files are guaranteed to be loaded serially
	var loadLibs = (function(){
		var head = d.getElementsByTagName('head')[0];
		var rspatt = /^(loaded)|(complete)$/;
		return function(urls, cback, doneCss) {
			cback = cback || function(){};
			// do all css files up front
			if (!doneCss) {
				var allUrls = urls;
				urls = [];
				for (var i=0; i<allUrls.length; i++) {
					if (isCss(allUrls[i]) && !isLoaded(allUrls[i])) {
						var link = d.createElement('link');
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = allUrls[i];
						head.appendChild(link);
					} else if (isJs(allUrls[i])) {
						urls.push(allUrls[i]);
					}
				}
			}
			// recursively load scripts
			if (urls.length) {
				var url = urls.shift();
				if (!isLoaded(url)) {
					var script = d.createElement('script');
					script.src = url;
					script.type = 'text/javascript';
					var ran = false;
					var loadNext = function(){
						if (ran) { return; }
						ran = true;
						loadLibs(urls, cback, true);
					};
					script.onload = script.onerror = loadNext;
					script.onreadystatechange = function(){
						if (rspatt.test(script.readyState)) { loadNext(); }
					};
					head.appendChild(script);
				} else {
					loadLibs(urls, cback, true);
				}
			} else {
				cback();
			}
		};
	})();

	// ###########################################################################
	// BUILD AND EXPOSE LIBRARY

	var FREELOADER = {
		lib:function(url){
			return {
				requires: function(urls){
					declareReqs(url, urls);
				},
				load: function(cback){
					var reqs = getReqs(url);
					loadLibs(reqs, cback);
				}
			};
		},
		patterns:{
			js:function(patts) {
				if (!(patts instanceof Array)) { patts = [patts]; }
				for (var i=0; i<patts.length; i++) {
					jsPatts.push(patts[i]);
				}
			},
			css:function(patts) {
				if (!(patts instanceof Array)) { patts = [patts]; }
				for (var i=0; i<patts.length; i++) {
					cssPatts.push(patts[i]);
				}
			}
		},
		id:function(id){
			return {
				onload:function(f){onElementLoadById(id,f);},
				requires:function(u, cback){
					var done = false;
					onElementLoadById(id,function(){
						if (done) { return; }
						done = true;
						loadLibs(getReqs(u), cback);
					});
				}
			};
		},
		className:function(c){
			return {
				onload:function(f){onElementLoadByClass(c,f);},
				requires:function(u, cback){
					var done = false;
					onElementLoadByClass(c,function(){
						if (done) { return; }
						done = true;
						loadLibs(getReqs(u), cback);
					});
				}
			};
		},
		benchmarks: {
			pollingIntervalMillis: function(){ return pause; },
			pollingExecutionAverageMillis: function(){ return Math.round(average); }
		}
	};

	w.FREELOADER = FREELOADER;

})(window, document);

