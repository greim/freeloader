/*
Copyright (c) 2013 Greg Reimer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function(window){

    /*
     * If AMD is available, use it, otherwise make freeloader a
     * global variable. This library only runs in browsers.
     */
    var isAmd = typeof window.define === "function" && window.define.amd;
    var define = isAmd ? window.define : function(list, cb){
        window.freeloader = cb(jQuery);
    };

    /*
     * By convention, variables local to this define callback
     * are prepended by _underscores.
     */
    define(['jquery'], function($){

        /*
         * Keep a copy of the slice method around.
         */
        var _slice = [].slice;

        /*
         * This is the list of specifications that freeloader
         * manages.
         */
        var _specs = [];

        /*
         * For use anywhere we need stuff that doesn't do
         * anything, but don't necessarily want to create
         * new stuff.
         */
        var _noop = function(){};
        var _empty = {};

        /*
         * Utility to generate unique strings local to here.
         */
        var _uString = (function(){
            var count = 0;
            return function(){
                return '_' + count++;
            };
        })();

        /*
         * freeloader tags DOM elements with this property
         * name so it knows which nodes it has seen and
         * which it hasn't.
         */
        var _tag = '__fl' + _uString();

        /*
         * A key feature of freeloader is that it operates on
         * stored live node lists. Which makes it easy and
         * inexpensive to look at the current state of the DOM.
         */
        var _byClass = (function(){
            var lists = {};
            return function(className){
                var list = lists[className];
                if (!list) {
                    list = lists[className] = document.getElementsByClassName(className);
                }
                return list;
            };
        })();

        /*
         * This function matches behavioral specs to DOM elements.
         */
        function _scan(cb){
            for (var i=0, leni=_specs.length; i<leni; i++){
                var Spec = _specs[i];
                var list = _byClass(Spec.className);
                for (var j=0, lenj=list.length; j<lenj; j++){
                    var el = list[j];
                    if (el[_tag] === undefined){
                        var tag = el[_tag] = {};
                    }
                    if (!el[_tag].hasOwnProperty(Spec.id)){
                        el[_tag][Spec.id] = new Spec(el);
                    }
                    cb && cb(el);
                }
            }
        }

        /*
         * Check the state of the DOM every so often.
         */
         (function(){
             var interval = 50;
             $(function(){ interval = 200; });
            (function loopCheck(){
                _scan();
                // TODO: stop or slow down the scan during page
                // invisibility, using the page visibility API.
                // and/or check document focus state.
                setTimeout(loopCheck, interval);
            })();
         })();

        /*
         * Provides a fail-safe for console errors. Some
         * browsers don't always expose a console object.
         */
        function _consoleError(err) {
            if (window.console && typeof console.error === 'function') {
                console.error(err);
            }
        }

        /*
         * Utility to iterate through the names and values of
         * objects.
         */
        function _iterateObj(obj, cb){
            if (!obj) {
                return;
            }
            for (var name in obj) {
                if (!obj.hasOwnProperty(name)){
                    continue;
                }
                cb(name, obj[name]);
            }
        }

        /*
         * This is a superclass that all spec classes will
         * extend. Descendant instances will be 'this' in all
         * spec methods, and have el and $el properties.
         */
        function SuperSpec(el){
            var spec = this;
            var $el = $(el);
            spec.el = el;
            spec.$el = $el;
            _iterateObj(spec.events, function(key, action){
                var matches = key.match(/^\s*(\S+)(\s+(.+))?$/i);
                if (!matches) {
                    throw new Error('malformed event string: '+key);
                }
                var eventType = matches[1];
                var selector = matches[3];
                var handler = function(ev){
                    spec[action].apply(spec, arguments);
                };
                if (selector) {
                    // use delegation
                    $el.on(eventType, selector, handler);
                } else {
                    // don't use delegation
                    $el.on(eventType, handler);
                }
            });
            spec.init();
        }

        /*
         * This function's job is to keep the prototype
         * chain intact.
         */
        SuperSpec.extend = function(protoProps) {
            var parent = this;
            var Spec = function(){ return parent.apply(this, arguments); };
            var Surrogate = function(){ this.constructor = Spec; };
            Surrogate.prototype = parent.prototype;
            Spec.prototype = new Surrogate;
            $.extend(Spec.prototype, protoProps);
            return Spec;
        };

        $.extend(SuperSpec.prototype, {

            /*
             * If things are not overridden by the spec, these
             * no-op versions are used.
             */
            init: _noop,
            events: _empty,
            subscriptions: _empty,

            /*
             * Called internally by freeloader.send(). In turn
             * calls an instance method.
             */
            send: function(name){
                if (this.subscriptions[name]) {
                    var args = _slice.call(arguments, 1);
                    this[name].apply(this, args);
                }
            },

            /*
             * Convenience $.find() on the DOM subtree.
             */
            $: function(){
                return $.find.apply(this.$el, arguments);
            }
        });

        /*
         * This is the object to be exported.
         */
        var _freeloader = {};

        /**
         * This creates a specification for a DOM element.
         * Its single argument is a specification object.
         */
        _freeloader.bind = function(className, spec){

            /*
             * This is the only required thing. Verify
             * that it exists.
             */
            if (!className){
                throw new Error('missing className');
            }

            /*
             * A spec is a constructor with a static id.
             */
            var Spec = SuperSpec.extend(spec);
            Spec.id = _uString();
            Spec.className = className;

            /*
             * Save this spec in the list.
             */
            _specs.push(Spec);
        };

        /**
         * Send a notification to any instance elements that
         * happen to be listening. Accepts a type string and
         * any optional arguments.
         */
        _freeloader.send = function(name){
            var sendArgs = arguments;
            _scan(function(el){
                _iterateObj(el[_tag], function(id, instance){
                    instance.send.apply(instance, sendArgs);
                });
            });
        };

        /*
         * Return from the define() call.
         */
        return _freeloader;
    });
})(window);
