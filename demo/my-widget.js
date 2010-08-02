var words = "Every time you add one of these widgets to the page, freeloader runs an initialization function on it. The init function displays the message \"loading...\" then adds this text after a 200ms delay.".split(/\s+/);
FREELOADER.className('widget').onload(function(){
	// initialize the widget
	var widg = this;
	widg.innerHTML = 'loading...';
	window.setTimeout(function(){
		widg.innerHTML = words.length ? words.shift() : '';
		jQuery(widg).addClass('loaded');
	},200);
});
