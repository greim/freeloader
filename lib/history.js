/* ---------------------------------------------------
 * @copyright (c) Greg Reimer https://github.com/greim
 * This source code is licensed under the MIT License
 * http://opensource.org/licenses/MIT
 */

var _ = require('lodash');
var $ = require('jquery');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var ready = false;

$(function(){
  setTimeout(function(){
    ready = true;
  },0);
});

function History(){
  EventEmitter.call(this);
  this._oldUrl = this.url();
  var self = this;
  $(window).on('popstate', function(ev){
    if (!ready){
      // avoid webkit's onload popstate
      return;
    }
    var newUrl = self.url();
    var shouldCall = newUrl !== self._oldUrl; // avoids popstates for hashchange since url() does not include frag id
    self._oldUrl = newUrl;
    if (shouldCall){
      self.emit('revisit');
    }
  });
}

util.inherits(History, EventEmitter);

_.extend(History.prototype, {

  works: function(){
    return (window.history && typeof window.history.pushState === 'function');
  },

  push: function(url){
    window.history.pushState({fl:true}, '', url);
    this._oldUrl = history.url();
  },

  replace: function(url){
    window.history.replaceState({fl:true}, '', url);
    this._oldUrl = history.url();
  },

  url: function(){
    return location.pathname + location.search;
  }
});

var history = module.exports = new History();

