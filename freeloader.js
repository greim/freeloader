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
     * global variable. This library only runs in browsers,
     * so don't worry about CommonJS.
     */
    var isAmd = typeof window.define === "function" && window.define.amd;
    var define = isAmd ? window.define : function(list, cb){
        window.freeloader = cb(jQuery);
    };

    /*
     * This lib depends heavily on jQuery. Namespace is
     * thus ensured in this function context. By convention,
     * variables local to this define callback are prepended
     * by _underscores.
     */
    define(['jquery'], function($){

        /*
         * Keep a copy of the slice method around for use on
         * arguments objects, rather than creating and throwing
         * away an array each time that needs to be done.
         */
        var _slice = [].slice;

        /*
         * This is the list of specifications that freeloader
         * manages. This list is local to freeloader's IIFE
         * and not visible to the rest of the world.
         */
        var _specs = [];

        /*
         * Utility to generate unique strings for use only
         * within this IIFE in order to uniquely identify specs.
         */
        var uString = (function(){
            var count = 0;
            return function(){
                return '_' + count++;
            };
        })();

        /*
         * DOM elements that freeloader have already seen are
         * tagged with this, so that freeloader knows not to
         * touch them again. When new HTML is injected onto
         * the page, those elements won't have this tag, and
         * thus freeloader will operate on them.
         */
        var _tag = '__spec' + uString();

        /*
         * Does the basic setup for init, validate and event
         * handlers on an instance element, based on a given
         * spec. Constructor function. Relationships between
         * specs and instance elements are many-to-many.
         * There is one of these instances for each mapping
         * between a spec and an instance element.
         */
        function Mapping(spec, el){

            /*
             * This supports freeloader's messaging API.
             */
            this.message = function(name, args){
                if (spec.subscriptions.hasOwnProperty(name)) {
                    spec.functions[name].call(args, tools);
                }
            };

            /*
             * Spec functions don't have direct access to
             * themselves. Instead, this "tools" utility is
             * passed to them as the last parameter, which
             * they can use to call other functions indirectly.
             */
            var tools = this.tools = {
                run: function(name){
                    var args = _slice.call(arguments);
                    args.shift();
                    args.push(tools);
                    spec.functions[name].apply(el, args);
                },
                bind: function(name, ctx){
                    ctx = ctx || el;
                    return function(){
                        var args = _slice.call(arguments);
                        args.push(tools);
                        spec.functions[name].apply(ctx, args);
                    };
                }
            };

            /*
             * If the spec finds the instance element to be
             * invalid, log an error, but attempt to continue.
             */
            if (spec.validate) {
                var error = spec.validate.call(el, tools);
                if (error) {
                    _consoleError(error);
                }
            }

            /*
             * Initialize the instance element!
             */
            if (spec.init) {
                spec.init.call(el, tools);
            }

            /*
             * Wire up events on the instance element.
             */
            var $el = $(el);
            _iterateObj(spec.events, function(key, action){
                var matches = key.match(/^\s*(\S+)(\s+(.+))?$/i);
                if (!matches) {
                    throw new Error('malformed event string: '+key);
                }
                var eventType = matches[1];
                var selector = matches[3];
                var handler = function(ev){
                    spec.functions[action].call(el, ev, tools);
                };
                if (selector) {
                    // use delegation
                    $el.on(eventType, selector, handler);
                } else {
                    // don't use delegation
                    $el.on(eventType, handler);
                }
            });
        }

        /*
         * A key feature of freeloader is that it operates on
         * stored live node lists. This is what gives freeloader
         * the ability to inexpensively audit the current state
         * of the DOM. This function initializes, stores and
         * returns such lists.
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
         * This function scans the DOM for elements that should
         * be controlled by a freeloader spec. It also has an
         * optional callback, so that a custom action can be
         * applied to an instance element. This callback enables
         * freeloader's messaging mechanism.
         */
        function _scan(cb){
            for (var i=0, len=_specs.length; i<len; i++){
                var spec = _specs[i];
                var list = _byClass(spec.classNameKey);
                for (var j=0, len=list.length; j<len; j++){
                    var el = list[j];
                    if (el[_tag] === undefined){
                        var tag = el[_tag] = {};
                    }
                    if (!el[_tag].hasOwnProperty(spec.id)){
                        el[_tag][spec.id] = new Mapping(spec, el);
                    }
                    cb && cb(el);
                }
            }
        }

        /*
         * This IIFE and async recursion does the periodic
         * scanning for new elements. Since it's asynchronous
         * recursion, there's no eventual stack overflow. Note
         * that the scanning isn't a DOM query, but rather just
         * a loop through a pre-existing list of elements.
         */
        (function loopCheck(){
            _scan();
            setTimeout(loopCheck,200);
        })();

        /*
         * Provides a fail-safe for console errors. Some
         * browsers don't expose a console object except when
         * the dev tools are open. This avoids runtime errors
         * in such cases.
         */
        function _consoleError(err) {
            if (window.console && typeof console.error === 'function') {
                console.error(err);
            }
        }

        /*
         * Utility to iterate through the names and values of
         * objects. Accepts undefined objects in which case it
         * returns immediately.
         */
        function _iterateObj(obj, cb){
            if (!_obj) {
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
         * This is the object to be exported. It's called
         * "freeloader" in the same spirit as REST and lazy
         * programming, which are useful techniques that are
         * supposed to save you a lot of work.
         */
        var _freeloader = {};

        /**
         * This creates a specification for a DOM element.
         * Its single argument is a specification object.
         */
        _freeloader.spec = function(spec){

            /*
             * This is the only required thing. Verify
             * that it exists.
             */
            if (!spec.classNameKey){
                throw new Error('missing classNameKey');
            }

            /*
             * Add it to the list.
             */
            spec = $.extend({
                events: {},
                subscriptions: {},
                functions: {}
            }, spec);
            spec.id = uString();
            _specs.push(spec);
        };

        /**
         * Send a notification to any instance elements that
         * happen to be listening. Accepts a type string and
         * an optional args object.
         */
        _freeloader.message = function(name, args){
            _scan(function(el){
                _iterateObj(el[_tag], function(id, mapping){
                    mapping.message(name, args);
                });
            });
        };

        /*
         * Return from the define() call.
         */
        return _freeloader;
    });
})(window);
