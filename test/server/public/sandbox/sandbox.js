var freeloader = require('../../../../freeloader');
var $ = require('jquery-browserify');

var app = freeloader();

$(document.documentElement).on('click', 'a[href^="/"]', function(ev){
  ev.preventDefault();
  var url = this.getAttribute('href');
  app.navigate(url);
});

app.bind('#nav li', {
  init: function(){
    this.$el.hide().fadeIn(1000 + Math.round(Math.random() * 3000));
  }
});


