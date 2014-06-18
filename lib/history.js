/* ---------------------------------------------------
 * @copyright (c) Greg Reimer https://github.com/greim
 * This source code is licensed under the MIT License
 * http://opensource.org/licenses/MIT
 */

var _ = require('lodash');
var $ = require('jquery');

var ready = false;

$(function(){
  setTimeout(function(){
    ready = true;
  },0);
});

var history = module.exports = {

  works: function(){
    return (window.history && typeof window.history.pushState === 'function');
  },

  push: function(url){
    window.history.pushState({fl:true}, '', url);
  },

  replace: function(url){
    window.history.replaceState({fl:true}, '', url);
  },

  onRevisit: function(callback, ctx){
    $(window).on('popstate', function(ev){
      if (!ready){
        // avoid webkit's onload popstate
        return;
      }
      var isOurs = (ev.originalEvent.state||{}).fl;
      var isOrig = history.url() === origUrl;
      if (isOurs || isOrig){
        return callback.call(ctx);
      }
    });
  },

  url: function(){
    return location.pathname + location.search + location.hash;
  }
};

var origUrl = history.url();
