var freeloader = require('../../../../freeloader');
var $ = require('jquery');

var app = freeloader({
  root: '/sandbox/'
});

$(document.documentElement).on('click', 'a[href^="/"]', function(ev){
  ev.preventDefault();
  var url = this.getAttribute('href');
  app.navigate(url);
});

app.bind('#nav li', {
  init: function(){
    this.$el.css({position:'relative',left:'200px'}).animate({left:'0px'}, 100 + Math.round(Math.random() * 300));
  }
});


