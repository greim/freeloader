

window.onload = function(){

	function crawl(elmt, visit){
		for (var i=0; i<elmt.childNodes.length; i++) {
			var child = elmt.childNodes[i];
					visit(child);
			if (child.nodeType === 1) {
				crawl(child, visit);
			}
		}
	}

	var nodeCount = 1;
	var elementCount = 1;
	crawl(document.documentElement,function(){
		nodeCount++;
	});
	crawl(document.documentElement,function(node){
		if (node.nodeType !== 1) { return; }
		elementCount++;
	});

	var pageSize = document.documentElement.innerHTML.length + 13;

	for (var i=0; i<x; i++) {FREELOADER.id('foo'+i).onload(function(){});}
	for (var i=0; i<x; i++) {FREELOADER.className('bar'+i).onload(function(){});}

	var pageSizeK = Math.round(pageSize / 1024) + ' kB';
	var pageSizeM = ((pageSize / 1048576) + '').replace(/(.*\.\d).*/,'$1')+' MB';
	var pageSizeStr = pageSize > 1048576 ? pageSizeM : pageSizeK;

	var append = '';
	append += '<p>';
	append += 'Page Size: '+pageSizeStr+'<br>';
	append += 'Total Node Count: '+nodeCount+'<br>';
	append += 'Total Element Count: '+elementCount+'<br>';
	append += 'Number of Different Classes/IDs Freeloader is polling for: '+(x*2);
	append += '</p>';
	append += '<textarea id="foo" style="width:99%;height:100em;"></textarea>';

	var div = document.getElementById('bar');
	div.innerHTML = append;

	for (var i=0; i<x; i++) {FREELOADER.id('foo'+i).onload(function(){});}
	for (var i=0; i<x; i++) {FREELOADER.className('bar'+i).onload(function(){});}

	FREELOADER.id('foo').onload(function(){
		var area = this;
		area.value='';
		window.setInterval(function(){
			   var intv = FREELOADER.benchmarks.pollingIntervalMillis();
			   var avg = FREELOADER.benchmarks.pollingExecutionAverageMillis();
			   area.value = 'After a '+intv+'ms pause, freeloader takes '+avg+'ms to search '+elementCount+' elements for '+(x*2)+' different classes and ids.\n'+area.value;
		},750);
	});

};
