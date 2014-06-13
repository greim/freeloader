/* ---------------------------------------------------
 * @copyright (c) Greg Reimer https://github.com/greim
 * This source code is licensed under the MIT License
 * http://opensource.org/licenses/MIT
 */

var _ = require('lodash');
var $ = require('jquery');

var slice = [].slice;

function sanitize(content){
  var $c = $(content);
  $c.find('script').remove();
  return $c;
},

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
  this.init();
  var $el = $(el);
  this.el = el;
  this.$el = $el;
  _.each(this.events, function(action, key){
    var matches = key.match(/^\s*(\S+)(\s+(.+))?$/i);
    if (!matches) {
      return;
    }
    var eventType = matches[1];
    var selector = matches[3];
    var handler = _.bind(function(ev){
      this[action].apply(this, arguments);
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

  /*
   * This can be overridden.
   * It runs at instantiation time, before attached to an element.
   */
  init: function(){},

  /*
   * This can be overridden.
   * It runs after attached to an element.
   */
  mount: function(){},

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
   * Send a message to sibling elements.
   * Will be handled by any matching handlers
   * in 'peers' handlers on controllers.
   */
  gossip: function(){
    this._comm(undefined, arguments);
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
    if (isDown === true){
      $els = this.$(cls);
    } else if (isDown === false) {
      $els = this.$el.parents(cls);
    } else {
      var el = this.el;
      $els = $(el.parentNode).children(cls)
      .filter(function(){
        return this !== el;
      });
    }

    var self = this;
    $els.each(function(){
      var el = this;
      _.each(el[self.app._tag], function(that){
        var handlers;
        if (isDown === true){
          handlers = that.above;
        } else if (isDown === false) {
          handlers = that.below;
        } else {
          handlers = that.peers;
        }
        if (!handlers){
          return;
        } else {
          if (handlers.hasOwnProperty(type)){
            try {
              that[handlers[type]].apply(that, args);
            } catch(ex) {
              setTimeout(function(){
                throw ex;
              },0);
            }
          }
        }
      });
      el = el.parentNode;
    });
  },

  _updateDom: function(opts, content){
    var $content = sanitize(content);
    if (opts.replace === true){
      // completely replace this node
      this.$el.before($content);
      this.$el.remove();
      this.app.scan();
    } else {
      // mutate the dom subtree of this node
      if (opts.replace){
        this.$(opts.replace).eq(0).replaceWith($content);
      } else if (opts.before){
        this.$(opts.before).eq(0).before($content);
      } else if (opts.after){
        this.$(opts.after).eq(0).after($content);
      } else if (opts.into){
        var $el = opts.into === true
          ? this.$el : this.$(opts.into).eq(0);
        $el.html($content);
      } else if (opts.append){
        var $el = opts.append === true
          ? this.$el : this.$(opts.append).eq(0);
        $el.append($content);
      } else if (opts.prepend){
        var $el = opts.prepend === true
          ? this.$el : this.$(opts.prepend).eq(0);
        $el.prepend($content);
      } else {
        throw new Error('missing inject target');
      }
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
    await('done')
    .run(function(pr){
      if (opts.html){
        this._updateDom(opts, opts.html);
        pr.keep('done');
      } else if (opts.url){
        var parts = opts.url.match(/^\s*(\S+)(\s+(.*))?/);
        var url = parts[1];
        var sel = parts[3];
        var self = this;
        $.ajax(url, {
          success: function(content){
            try {
              if (sel){
                content = $(content).find(sel);
              }
              self._updateDom(opts, content);
              pr.keep('done');
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
    })
    .onfail(function(err){
      callback.call(ctx, err);
    })
    .onkeep(function(){
      callback.call(ctx, null);
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
