var words = "Every time you add one of these widgets to the page, freeloader runs an initialization function on it. The init function adds this text. . . . . . . . . . . . . San Dimas High School Football Rules!!!".split(/\s+/);
FREELOADER.className('widget').onload(function(){
	// initialize the widget
	var widg = this;
	window.setTimeout(function(){
		widg.innerHTML = words.length ? words.shift() : '';
		jQuery(widg).removeClass('loading');
	},200);
});
