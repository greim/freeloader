/* ---------------------------------------------------
 * @copyright (c) Greg Reimer https://github.com/greim
 * This source code is licensed under the MIT License
 * http://opensource.org/licenses/MIT
 */

var _ = require('lodash');
var $ = require('jquery');
var await = require('await');

var slice = [].slice;

function sanitize(content){
  var $c = $(content);
  $c.find('script').remove();
  return $c;
}

/**
 * Control a DOM subtree with various event routers:
 *
 * - subs:
 * --- handles: app-wide pub/sub events
 * --- trigger: this.publish() in other controllers
 * - below:
 * --- handles: incoming messages from descendant nodes
 * --- trigger: this.up() in other controllers
 * - above:
 * --- handles: incoming messages from ancestor nodes
 * --- trigger: this.down() in other controllers
 * - events:
 * --- handles: DOM events (using event delegation on this.el)
 * --- trigger: user clicks, etc
 *
 * Controllers aren't instantiated manually. Instead, they're
 * created automatically at DOM ready and as this.html() is
 * called from within controllers.
 */
function Controller(el, app){
  this.app = app;
  this._run('life','init');
  var $el = $(el);
  this.el = el;
  this.$el = $el;
  _.each(this.events, function(methods, key){
    var matches = key.match(/^\s*(\S+)(\s+(.+))?$/i);
    if (!matches) {
      return;
    }
    var eventType = matches[1];
    var selector = matches[3];
    var handler = _.bind(function(){
      // this is a jquery handler now
      this._run('events', key, arguments);
    }, this);
    if (selector) {
      // use delegation
      $el.on(eventType, selector, handler);
    } else {
      // don't use delegation
      $el.on(eventType, handler);
    }
  }, this);
}

/*
 * Taken nearly verbatim from Backbone.
 */
Controller.extend = function(protoProps, staticProps) {
  var parent = this;
  var child;
  if (protoProps && _.has(protoProps, 'constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ return parent.apply(this, arguments); };
  }
  _.extend(child, parent, staticProps);
  var Surrogate = function(){ this.constructor = child; };
  Surrogate.prototype = parent.prototype;
  child.prototype = new Surrogate;
  if (protoProps) _.extend(child.prototype, protoProps);
  child.__super__ = parent.prototype;
  return child;
};

Controller.prototype = {

  _run: function(router, eventName, args){
    if (!this[router]){
      return;
    } else if (!this[router][eventName]) {
      return;
    } else {
      var methods = this[router][eventName];
      if (!_.isArray(methods)){
        methods = [methods];
      }
      for (var i=0; i<methods.length; i++){
        this[methods[i]].apply(this, args || []);
      }
    }
  },

  /*
   * If the DOM subtree has been modified,
   * check for unbound elements.
   */
  scan: function(){
    this.app.scan(this.el);
  },

  /*
   * Publish an event from this view.
   */
  publish: function(type){
    var args = slice.call(arguments);
    args[0] = {
      type: type,
      source: this
    };
    return this.app.publish.apply(this.app, args);
  },

  /*
   * Send a message up the DOM tree.
   * Will be handled by any matching handlers
   * in 'below' handlers on controllers.
   */
  up: function(){
    this._comm(false, arguments);
  },

  /*
   * Send a message down the DOM tree.
   * Will be handled by any matching handlers
   * in 'above' handlers on controllers.
   */
  down: function(){
    this._comm(true, arguments);
  },

  /*
   * Helper method to support up and down.
   */
  _comm: function(isDown, args){
    args = slice.call(args);
    var type = args[0];
    args[0] = {
      type: type,
      source: this
    };

    var $els, cls = '.' + this.app._tagClass;
    if (isDown){
      $els = this.$(cls);
    } else {
      $els = this.$el.parents(cls);
    }

    var self = this;
    $els.each(function(){
      var el = this;
      _.each(el[self.app._tag], function(that){
        var router;
        if (isDown){
          router = 'above';
        } else {
          router = 'below';
        }
        try {
          that._run(router, type, args);
        } catch(ex) {
          setTimeout(function(){
            throw ex;
          },0);
        }
      });
      el = el.parentNode;
    });
  },

  _updateDom: function(opts, content){
    var $content = sanitize(content);
    var parent = this.el.parentNode;
    var scanFromParent = true;
    var $el = this.$el;
    if (opts.replace){
      if (typeof opts.replace === 'string'){
        scanFromParent = false;
        $el = this.$(opts.replace).eq(0);
      }
      $el.replaceWith($content);
    } else if (opts.before){
      if (typeof opts.before === 'string'){
        scanFromParent = false;
        $el = this.$(opts.before).eq(0);
      }
      $el.before($content);
    } else if (opts.after){
      if (typeof opts.after === 'string'){
        scanFromParent = false;
        $el = this.$(opts.after).eq(0);
      }
      $el.after($content);
    } else if (opts.into){
      scanFromParent = false;
      if (typeof opts.into === 'string'){
        $el = this.$(opts.into).eq(0);
      }
      $el.html($content);
    } else if (opts.append){
      scanFromParent = false;
      if (typeof opts.append === 'string'){
        $el = this.$(opts.append).eq(0);
      }
      $el.append($content);
    } else if (opts.prepend){
      scanFromParent = false;
      if (typeof opts.prepend === 'string'){
        $el = this.$(opts.prepend).eq(0);
      }
      $el.prepend($content);
    } else {
      throw new Error('missing inject target');
    }
    if (scanFromParent){
      this.app.scan(parent);
    } else {
      this.scan();
    }
  },

  /*
   * // where to get content from (must have one)
   * this.inject({ html: '<p></p>' }) // get content from an html string
   * this.inject({ html: element }) // get content from a DOM element or jQuery object
   * this.inject({ url: '/foo.html' }) // get content from a url
   * this.inject({ url: '/foo.html .menu' }) // get content from a selection within a url
   *
   * // where to put content (must have one)
   * this.inject({ into: true }) // replace this.el inner contents
   * this.inject({ into: '.menu' }) // replace this.$('.menu') inner contents
   * this.inject({ replace: true }) // replace this.el
   * this.inject({ replace: '.menu' }) // replace this.$('.menu')
   * this.inject({ before: '.menu' }) // add before this.$('.menu')
   * this.inject({ after: '.menu' }) // add after this.$('.menu')
   * this.inject({ prepend: true }) // prepend to this.el
   * this.inject({ prepend: '.menu' }) // prepend to this.$('.menu')
   * this.inject({ append: true }) // append to this.el
   * this.inject({ append: '.menu' }) // append to this.$('.menu')
   */
  inject: function(opts, callback, ctx){
    await('content')
    .run(function(pr){
      if (opts.html){
        var $content = $(opts.html);
        this._updateDom(opts, $content);
        pr.keep('content', $content);
      } else if (opts.url){
        var parts = opts.url.match(/^\s*(\S+)(\s+(.*))?/);
        var url = parts[1];
        var sel = parts[3];
        var self = this;
        $.ajax(url, {
          success: function(content){
            try {
              var $allContent = $(content),
                $content = $allContent;
              if (sel){
                $content = $allContent.find(sel);
              }
              self._updateDom(opts, $content);
              pr.keep('content', $allContent);
            } catch(ex) {
              pr.fail(ex);
            }
          },
          error: function(xhr){
            var message;
            if (/^4\d\d$/.test(xhr.status)){
              message = 'Client error, status ' + xhr.status;
            } else if (/^5\d\d$/.test(xhr.status)){
              message = 'Server error, status ' + xhr.status;
            } else {
              message = 'Error, status ' + xhr.status;
            }
            pr.fail(new Error(message));
          }
        });
      } else {
        pr.fail(new Error('no source specified for inject'));
      }
    }, this)
    .onfail(function(err){
      callback && callback.call(ctx, err);
    })
    .onkeep(function(got){
      callback && callback.call(ctx, null, got.content);
    });
  },

  /*
   * Convenience $el.find() on DOM subtree.
   */
  $: function(){
    return this.$el.find.apply(this.$el, arguments);
  }
};

module.exports = Controller;
