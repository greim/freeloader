/* ---------------------------------------------------
 * @copyright (c) Greg Reimer https://github.com/greim
 * This source code is licensed under the MIT License
 * http://opensource.org/licenses/MIT
 */

var _ = require('lodash');
var $ = require('jquery');
var await = require('await');
var Controller = require('./lib/controller');
var parser = require('./lib/document-parser');
var history = require('./lib/history');
var loader = require('./lib/fast-loader');
var byClass = require('./lib/fast-classer');

var slice = [].slice,
  prefix = '__fl_',
  tag = prefix + ((Math.random()+'').replace(/.*(\d\d\d)$/,'$1')),
  tagClass = prefix + '_bound',
  loaded = false,
  docEl = document.documentElement;

$(function(){
  loaded = true;
});

var makeUniqueString = (function(){
  var count = 0;
  return function(){
    return '_' + count++;
  };
})();

var makeClassForSubs = (function(){
  var patt = /[^a-z0-9_-]/ig;
  return function(name) {
    name = name.replace(patt, '_');
    return prefix + 'subs_' + name;
  };
})();

module.exports = function(){

  var bindings = [];

  function scan(root){
    root = root || docEl;
    var controllers;
    for (var i=0, leni=bindings.length; i<leni; i++){
      var binding = bindings[i];
      var $list = $(binding.selector, root);
      for (var j=0, lenj=$list.length; j<lenj; j++){
        var el = $list[j];
        var $el = $(el);
        if (el[tag] === undefined){
          el[tag] = {};
          $el.addClass(tagClass);
        }
        if (!el[tag].hasOwnProperty(binding.id)){
          _.each(binding.Controller.prototype.subs, function(val, name){
            $el.addClass(makeClassForSubs(name));
          });
          var controller = new binding.Controller(el, app);
          el[tag][binding.id] = controller;
          controllers || (controllers = []);
          controllers.push(controller);
        }
      }
    }
    controllers && _.each(controllers, function(controller){
      controller._run('life','mount');
    });
  }

  $(function(){ scan(); });

  function getElementsBySubsClass(name){
    return byClass(makeClassForSubs(name));
  };

  var app = {

    /**
     * var MyController = freeloader.Controller.extend({ ... });
     * app.bind('div.foo', MyController)
     * app.bind('div.foo', { ... });
     * var FooController = freeloader.Controller.extend({ ... });
     * var FooBarController = FooController.extend({ ... });
     * app.bind('div.foo', FooController)
     * app.bind('div.foo.bar', FooBarController)
     */
    bind: function(selector, Cont){
      if (Cont === Controller){
        throw new Error('must extend controller');
      }
      if (!(Cont.prototype instanceof Controller)){
        Cont = Controller.extend(Cont);
      }
      bindings.push({
        Controller: Cont,
        id: makeUniqueString(),
        selector: selector
      });
      if (loaded){
        scan();
      }
    },

    publish: function(){
      var args = slice.call(arguments);
      if (typeof args[0] === 'string'){
        args[0] = {type:args[0]};
      }
      var type = args[0].type;
      var subscribingEls = getElementsBySubsClass(type);
      for (var i=0, len=subscribingEls.length; i<len; i++){
        var tagObj = subscribingEls[i][tag];
        _.each(tagObj, function(controller){
          controller._run('subs', type, args);
        });
      }
    },

    on: function(eventName, cb, ctx){
      var handlers = this._handlers;
      if (!handlers){
        handlers = this._handlers = {};
      }
      if (!handlers[eventName]){
        handlers[eventName] = [];
      }
      handlers[eventName].push({cb:cb,ctx:ctx});
    },

    trigger: function(eventName){
      var handlers = this._handlers;
      if (!handlers || !handlers[eventName]){
        return;
      }
      var args = slice.call(arguments);
      args.shift();
      handlers[eventName].forEach(function(h){
        h.cb.apply(h.ctx, args);
      });
    },

    navigate: function(opts, callback, ctx){
      if (typeof opts === 'string'){
        opts = { url: opts };
      } else if (!opts) {
        opts = {};
      }
      if (!opts.url){
        opts.url = history.url();
      }
      if (history.works()){
        loader.loadPage(opts, function(err){
          if (err){
            cb.call(ctx, err);
          } else {
            history[opts.replace ? 'replace' : 'push'](opts.url);
            cb.call(ctx, null);
          }
        });
      } else {
        if (opts.replace){
          location.replace(opts.url);
        } else {
          location.href = opts.url;
        }
      }
    },

    reload: function(callback, ctx){
      this.navigate({replace:true}, callback, ctx);
    },

    scan: scan,
    _tag: tag,
    _tagClass: tagClass,
    _reset: function(){
      // only to support testing
      bindings.length = 0;
    }
  };

  history.onPop(function(url){
    loader.loadPage(url, function(err){
      if (err){
        app.trigger('history-error');
      }
    });
  });

  return app;
};

// ########################################################################

module.exports.Controller = Controller;
