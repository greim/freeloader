(function($){

	/*
	FREELOADER.lib(url).requires(url);                 // build a dependency graph
	FREELOADER.lib(url).load(callback);                // load a lib and its dependencies, exe callback when done
	FREELOADER.patterns.js(array);                     // urls matching any of these patterns are treated as js
	FREELOADER.patterns.css(array);                    // urls matching any of these patterns are treated as css
	FREELOADER.id(str).requires(url, callback);        // load library when first instance of id appears in dom
	FREELOADER.id(str).onload(setup);                  // run this against every instance of id that occurs in dom
	FREELOADER.className(str).requires(url, callback); // load library when first instance of class appears in dom
	FREELOADER.className(str).onload(setup);           // run this against every instance of class that occurs in dom
	*/

	describe('freeloader.js', function () {
		it('should let you declare dependencies and load libraries with callback', function() {
			$.patterns.js(/spec\/meta\.php\?/);
			var lib1 = 'spec/meta.php?s='+encodeURIComponent('var A=[];');
			var lib2 = 'spec/meta.php?s='+encodeURIComponent('A.push(true);');
			$.lib(lib2).requires(lib1);
			var loaded = false;
			$.lib(lib2).load(function(){ loaded = true; });
			waits(400);
			runs(function(){
				expect(A).toBeDefined();
				expect(A.length).toEqual(1);
				expect(loaded).toEqual(true);
			});
		});
		it('should run once against every instance of an id', function() {
			var ran = 0;
			var contents = '';
			$.id('foo1').onload(function(){ contents = this.innerHTML; ran++; });
			var span = document.createElement('span');
			span.id = 'foo1';
			span.innerHTML = 'xyz';
			document.body.appendChild(span);
			waits(400);
			runs(function(){
				expect(ran).toEqual(1);
				expect(contents).toEqual('xyz');
			});
			runs(function(){
				document.body.removeChild(span);
				span = document.createElement('span');
				span.id = 'foo1';
				document.body.appendChild(span);
			});
			waits(400);
			runs(function(){
				expect(ran).toEqual(2);
			});
		});
		it('should run once against every instance of a class', function() {
			var ran = 0;
			$.className('foo1').onload(function(){ ran++; });
			var span = document.createElement('span');
			span.className = 'foo1';
			document.body.appendChild(span);
			span = document.createElement('span');
			span.className = 'foo1';
			document.body.appendChild(span);
			waits(400);
			runs(function(){
				expect(ran).toEqual(2);
			});
		});
		it('should load a library upon first instance of an id', function() {
			var lib = 'spec/meta.php?s='+encodeURIComponent('var FOO2 = true;');
			$.id('foo2').requires(lib);
			var span = document.createElement('span');
			span.id = 'foo2';
			document.body.appendChild(span);
			waits(400);
			runs(function(){
				expect(FOO2).toEqual(true);
			});
		});
		it('should load a library upon first instance of a class', function() {
			var lib = 'spec/meta.php?s='+encodeURIComponent('var FOO3 = true;');
			$.className('foo3').requires(lib);
			var span = document.createElement('span');
			span.className = 'foo3';
			document.body.appendChild(span);
			waits(400);
			runs(function(){
				expect(FOO3).toEqual(true);
			});
		});
		it('should ignore duplicates in the dependency graph', function() {
			window.X={a:[],b:[],c:[],d:[],e:[],f:[],g:[],h:[]};
			var libA = 'spec/meta.php?s='+encodeURIComponent('X.a.push(true);');
			var libB = 'spec/meta.php?s='+encodeURIComponent('X.b.push(true);');
			var libC = 'spec/meta.php?s='+encodeURIComponent('X.c.push(true);');
			var libD = 'spec/meta.php?s='+encodeURIComponent('X.d.push(true);');
			var libE = 'spec/meta.php?s='+encodeURIComponent('X.e.push(true);');
			var libF = 'spec/meta.php?s='+encodeURIComponent('X.f.push(true);');
			var libG = 'spec/meta.php?s='+encodeURIComponent('X.g.push(true);');
			var libH = 'spec/meta.php?s='+encodeURIComponent('X.h.push(true);');
			$.lib(libA).requires([libB,libC,libD]);
			$.lib(libB).requires(libE);
			$.lib(libD).requires(libF);
			$.lib(libE).requires([libF,libG,libH]);
			$.lib(libA).load();
			waits(1000);
			runs(function(){
				for (var letter in X) {
					expect(X[letter].length).toEqual(1);
				}
			});
		});
		it('should not explode when it encounters circular dependency graphs', function() {
			window.Y={a:[],b:[],c:[]};
			var libA = 'spec/meta.php?s='+encodeURIComponent('Y.a.push(true);');
			var libB = 'spec/meta.php?s='+encodeURIComponent('Y.b.push(true);');
			var libC = 'spec/meta.php?s='+encodeURIComponent('Y.c.push(true);');
			$.lib(libA).requires(libB);
			$.lib(libB).requires(libC);
			$.lib(libC).requires(libA);
			$.lib(libA).load();
			waits(1000);
			runs(function(){
				for (var letter in Y) {
					expect(Y[letter].length).toEqual(1);
				}
			});
		});
		it('should skip libraries that do not exist and continue loading', function() {
			var libA = 'spec/meta.php?s='+encodeURIComponent('Z=true;');
			var libB = 'dfgdkjfghdkfjg.js';//does not exist
			var libC = 'spec/meta.php?s='+encodeURIComponent('Z=false;Z1=true;');
			$.lib(libA).requires(libB);
			$.lib(libB).requires(libC);
			$.lib(libA).load();
			waits(1000);
			runs(function(){
				expect(Z1).toEqual(true);
				expect(Z).toEqual(true);
			});
		});
		it('should execute library callbacks after the library itself executes', function() {
			var lib = 'spec/meta.php?s='+encodeURIComponent('ZZ=false;');
			$.lib(lib).load(function(){
				ZZ = true;
			});
			waits(1000);
			runs(function(){
				expect(ZZ).toEqual(true);
			});
		});
		it('should provide benchmarks', function() {
			var interval = $.benchmarks.pollingIntervalMillis();
			var average = $.benchmarks.pollingExecutionAverageMillis();
			expect(interval < 250).toEqual(true);
			expect(average < 25).toEqual(true);
		});
	});
})(FREELOADER);

