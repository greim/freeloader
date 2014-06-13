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

module.exports = {

  works: function(){
    return (window.history && typeof window.history.pushState === 'function');
  },

  push: function(url){
    window.history.pushState({}, '', url);
  },

  replace: function(url){
    window.history.replaceState({}, '', url);
  },

  onPop: function(callback, ctx){
    var callback = _.bind(callback, ctx);
    $(window).on('popstate', function(ev){
      if (!ready){
        // avoid webkit's onload popstate
        return;
      }
      return callback.apply(this, location.pathname + location.search);
    });
  },

  url: function(){
    return location.pathname + location.search;
  }
};
