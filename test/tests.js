var freeloader = require('../freeloader');
var $ = require('jquery');
var assert = require('assert')

var app = freeloader();

afterEach(function(){
  app._reset();
  $(document.body).empty();
});

describe('freeloader.bind()', function(){

  it('should bind bare object', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { init: 'init' },
      init: function(){
        done();
      }
    });
  });

  it('should bind extended object', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', freeloader.Controller.extend({
      life: { init: 'init' },
      init: function(){
        done();
      }
    }));
  });

  it('should not bind unextended Controller', function(){
    assert.throws(function(){
      app.bind('#test', freeloader.Controller);
    });
  });
});

describe('Controller', function(){

  it('should init', function(done){
    $('body').append('<div id="test1"></div>');
    app.bind('#test1', {
      life: { init: 'init' },
      init: function(){
        done();
      }
    });
  });

  it('should mount', function(done){
    $('body').append('<div id="test2"></div>');
    app.bind('#test2', {
      life: { mount: 'mount' },
      mount: function(){
        done();
      }
    });
  });

  it('one should bind on multiple elements', function(done){
    $('body').append('<div class="test"></div><div class="test"></div>');
    var mountCount = 0;
    app.bind('.test', {
      life: { mount: 'mount' },
      mount: function(){
        mountCount++;
        if (mountCount === 2){
          done();
        }
      }
    });
  });

  it('multiple should bind on one element', function(done){
    $('body').append('<div class="test"></div>');
    var mountCount = 0;
    var C = freeloader.Controller.extend({
      life: { mount: 'mount' },
      mount: function(){
        mountCount++;
        if (mountCount === 2){
          done();
        }
      }
    });
    app.bind('.test', C);
    app.bind('.test', C);
  });
});

describe('Controller inheritance', function(){

  var MyController1 = freeloader.Controller.extend({ foo: function(){} });
  var MyController2 = MyController1.extend({ bar: function(){} });

  it('should prototype chain', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', MyController2.extend({
      life: { mount: 'mount' },
      mount: function(){
        assert.ok(this instanceof freeloader.Controller);
        assert.ok(this instanceof MyController1);
        assert.ok(this instanceof MyController2);
        done();
      }
    }));
  });

  it('should inherit', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', MyController2.extend({
      life: { mount: 'mount' },
      mount: function(){
        assert.equal('function', typeof this.foo);
        assert.equal('function', typeof this.bar);
        done();
      }
    }));
  });

  it('should prototype', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', MyController2.extend({
      life: { mount: 'mount' },
      mount: function(){
        assert.ok(!this.hasOwnProperty('foo'));
        assert.ok(!this.hasOwnProperty('bar'));
        done();
      }
    }));
  });
});

describe('Controller lifecycle events', function(){

  it('should lifecycle', function(done){
    $('body').append('<div id="test3"></div>');
    var result = '';
    app.bind('#test3', {
      life: {
        init: 'init',
        mount: 'mount'
      },
      init: function(){
        result += 'a';
      },
      mount: function(){
        result += 'b';
        assert.equal('ab', result);
        done();
      }
    });
  });

  it('should lifecycle multi', function(done){
    $('body').append('<div id="test3"></div>');
    var result = '';
    app.bind('#test3', {
      life: {
        init: ['init1','init2'],
        mount: ['mount1','mount2']
      },
      init1: function(){
        result += 'a';
      },
      init2: function(){
        result += 'b';
      },
      mount1: function(){
        result += 'c';
      },
      mount2: function(){
        result += 'd';
        assert.equal('abcd', result);
        done();
      }
    });
  });

  it('should have correct this in mount and init', function(done){
    $('body').append('<div class="test"></div>');
    var C = freeloader.Controller.extend({
      life: {
        init: 'init',
        mount: 'mount'
      },
      init: function(){
        assert.ok(this instanceof C);
      },
      mount: function(){
        assert.ok(this instanceof C);
        done();
      }
    });
    app.bind('.test', C);
  });

  it('should have an app property when inited', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { init: 'init' },
      init: function(){
        assert.ok(this.app === app);
        done();
      }
    });
  });

  it('should have an el property when mounted', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        assert.ok(this.el && this.el.parentNode);
        done();
      }
    });
  });

  it('should have an $el property when mounted', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        assert.ok(this.$el && this.$el instanceof $);
        assert.strictEqual(this.$el.get(0), this.el);
        done();
      }
    });
  });

  it('should be live in the DOM when mounted', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        assert.ok($.contains(document.documentElement, this.el));
        done();
      }
    });
  });

  it('should have a $ property when mounted', function(done){
    $('body').append('<div id="test"><br></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        assert.strictEqual(1, this.$('br').length);
        done();
      }
    });
  });
});

describe('Controller DOM events', function(){

  it('should accept empty event objects', function(){
    app.bind('#test', { events: {} });
  });

  it('should accept non-empty event objects', function(){
    app.bind('#test', { events: { 'click': 'foo' } });
  });

  it('should handle a direct DOM event', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.$el.trigger('click');
      },
      events: {'click':'handleClick'},
      handleClick: function(){
        done();
      }
    });
  });

  it('should handle a delegated DOM event', function(done){
    $('body').append('<div id="test"><span></span></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.$('span').trigger('click');
      },
      events: {'click span':'handleClick'},
      handleClick: function(){
        done();
      }
    });
  });

  it('should have correct this in handler', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.$el.trigger('click');
      },
      events: {'click':'handleClick'},
      handleClick: function(ev){
        assert.ok(this instanceof freeloader.Controller);
        done();
      }
    });
  });

  it('should have correct args in handler', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.$el.trigger('click');
      },
      events: {'click':'handleClick'},
      handleClick: function(ev){
        assert.ok(ev);
        assert.ok(typeof ev.preventDefault === 'function');
        done();
      }
    });
  });

  it('should fail on missing method', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        var self = this;
        assert.throws(function(){
          self.$el.trigger('click');
        });
        done();
      },
      events: {'click':'handleClick'}
    });
  });
});

describe('Controller subscriptions', function(){

  it('should work', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.publish('baz');
      },
      subs: {'baz':'baz'},
      baz: function(ev){
        done();
      }
    });
  });

  it('should work synchronously', function(done){
    $('body').append('<div id="test"></div>');
    var result = '';
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.publish('baz');
        result += 'b';
        assert.equal('ab',result);
        done();
      },
      subs: {'baz':'baz'},
      baz: function(ev){
        result += 'a';
      }
    });
  });

  it('should work locally', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.publish('baz');
      },
      subs: {'baz':'baz'},
      baz: function(ev){
        assert.strictEqual(this, ev.source);
        done();
      }
    });
  });

  it('should work globally', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.app.publish('baz');
      },
      subs: {'baz':'baz'},
      baz: function(ev){
        assert.strictEqual(undefined, ev.source);
        done();
      }
    });
  });

  it('should have this', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.publish('baz');
      },
      subs: {'baz':'baz'},
      baz: function(ev){
        assert.ok(this instanceof freeloader.Controller);
        done();
      }
    });
  });

  it('should pass args', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.publish('baz', 0, false);
      },
      subs: {'baz':'baz'},
      baz: function(ev, a1, a2){
        assert.strictEqual(3, arguments.length);
        assert.strictEqual(0, a1);
        assert.strictEqual(false, a2);
        done();
      }
    });
  });

  it('should work multi', function(done){
    $('body').append('<div id="test"></div>');
    var result = '';
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.app.publish('baz');
      },
      subs: {'baz':['baz1','baz2']},
      baz1: function(ev){
        result += 'a';
      },
      baz2: function(ev){
        result += 'b';
        assert.equal('ab', result);
        done();
      }
    });
  });

  it('should fail on missing method', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        var self = this;
        assert.throws(function(){
          self.app.publish('baz');
        });
        done();
      },
      subs: {'baz':'baz'}
    });
  });

  it('should not work if not in DOM', function(done){
    $('body').append('<div id="test"></div>');
    var result = '';
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.$el.remove();
        this.publish('baz');
        result += 'b';
        assert.equal('b',result);
        done();
      },
      subs: {'baz':'baz'},
      baz: function(ev){
        result += 'a';
      }
    });
  });
});

describe('Controller upward messaging', function(){

  it('should work', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#outer', {
      below: {'x':'foo'},
      foo: function(ev){
        done();
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x');
      }
    });
  });

  it('should work synchronously', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    var result = ''
    app.bind('#outer', {
      below: {'x':'foo'},
      foo: function(ev){
        result += 'a';
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x');
        result += 'b';
        assert.equal('ab', result)
        done()
      }
    });
  });

  it('should work multi', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    var result = '';
    app.bind('#outer', {
      below: {'x':['foo','bar']},
      foo: function(ev){ result += 'a' },
      bar: function(ev){
        result += 'b';
        assert.equal('ab', result)
        done();
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x');
      }
    });
  });

  it('should have event type', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#outer', {
      below: {'x':'foo'},
      foo: function(ev){
        assert.equal('x', ev.type);
        done();
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x');
      }
    });
  });

  it('should work with this', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#outer', {
      below: {'x':'foo'},
      foo: function(ev){
        assert.ok(this instanceof freeloader.Controller);
        done();
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x');
      }
    });
  });

  it('should work with args', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#outer', {
      below: {'x':'foo'},
      foo: function(ev, a1, a2){
        assert.strictEqual(true, a1)
        assert.strictEqual(1, a2)
        done();
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x', true, 1);
      }
    });
  });

  it('should only work up', function(done){
    $('body').append('<div id="outer"><div id="inner"></div><div id="sibling"></div></div>');
    app.bind('#sibling', {
      below: {'x':'foo'},
      foo: function(ev){
        done(new Error('should not be called'));
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x');
        done();
      }
    });
  });
});

describe('Controller downward messaging', function(){

  it('should work', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#inner', {
      above: {'x':'foo'},
      foo: function(ev){
        done();
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x');
      }
    });
  });

  it('should work synchronously', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    var result = ''
    app.bind('#inner', {
      above: {'x':'foo'},
      foo: function(ev){
        result += 'a';
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x');
        result += 'b';
        assert.equal('ab', result)
        done()
      }
    });
  });

  it('should work multi', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    var result = '';
    app.bind('#inner', {
      above: {'x':['foo','bar']},
      foo: function(ev){ result += 'a' },
      bar: function(ev){
        result += 'b';
        assert.equal('ab', result)
        done();
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x');
      }
    });
  });

  it('should have event type', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#inner', {
      above: {'x':'foo'},
      foo: function(ev){
        assert.equal('x', ev.type);
        done();
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x');
      }
    });
  });

  it('should work with this', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#inner', {
      above: {'x':'foo'},
      foo: function(ev){
        assert.ok(this instanceof freeloader.Controller);
        done();
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x');
      }
    });
  });

  it('should work with args', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#inner', {
      above: {'x':'foo'},
      foo: function(ev, a1, a2){
        assert.strictEqual(true, a1)
        assert.strictEqual(1, a2)
        done();
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x', true, 1);
      }
    });
  });

  it('should only work down', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div><div id="sibling"></div>');
    app.bind('#sibling', {
      above: {'x':'foo'},
      foo: function(ev){
        done(new Error('should not be called'));
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x');
        done();
      }
    });
  });
});

describe('Controller injection', function(){

  describe('replace', function(){

    it('should replace true', function(done){
      $('body').append('<div id="test"></div>');
      var mounted = false;
      app.bind('.injected', {
        life: { mount: 'mount' },
        mount: function(){
          mounted = true;
        }
      });
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          var parentNode = this.el.parentNode;
          this.inject({
            html: '<span class="injected"></span>',
            replace: true
          }, function(err){
            assert.ok(!$.contains(parentNode, this.el))
            assert.strictEqual(1, $(parentNode).find('.injected').length)
            assert.ok(mounted)
            done(err)
          }, this);
        }
      });
    })

    it('should replace selector', function(done){
      $('body').append('<div id="test"><span></span></div>');
      var mounted = false;
      app.bind('.injected', {
        life: { mount: 'mount' },
        mount: function(){
          mounted = true;
        }
      });
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            html: '<em class="injected"></em>',
            replace: 'span'
          }, function(err){
            assert.strictEqual(1, this.$('.injected').length);
            assert.ok(mounted)
            done(err)
          }, this);
        }
      });
    })
  });

  describe('into', function(){

    it('should inject into true', function(done){
      $('body').append('<div id="test"></div>');
      var mounted = false;
      app.bind('.injected', {
        life: { mount: 'mount' },
        mount: function(){
          mounted = true;
        }
      });
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            html: '<span class="injected"></span>',
            into: true
          }, function(err){
            assert.strictEqual(1, this.$('.injected').length);
            assert.ok(mounted)
            done(err)
          }, this)
        }
      });
    });

    it('should inject into selector', function(done){
      $('body').append('<div id="test"><em></em></div>');
      var mounted = false;
      app.bind('.injected', {
        life: { mount: 'mount' },
        mount: function(){
          mounted = true;
        }
      });
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            html: '<span class="injected"></span>',
            into: 'em'
          }, function(err){
            assert.strictEqual(1, this.$('em .injected').length);
            assert.ok(mounted)
            done(err)
          }, this)
        }
      });
    });
  });

  describe('before', function(){

    it('should inject before true', function(done){
      $('body').append('<div id="test"></div>');
      var mounted = false;
      app.bind('.injected', {
        life: { mount: 'mount' },
        mount: function(){
          mounted = true
        }
      });
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            html: '<span class="injected"></span>',
            before: true
          }, function(err){
            assert.ok(this.$el.prev().is('.injected'));
            assert.ok(mounted)
            done(err)
          }, this)
        }
      });
    });

    it('should inject before selector', function(done){
      $('body').append('<div id="test"><em></em></div>');
      var mounted = false;
      app.bind('.injected', {
        life: { mount: 'mount' },
        mount: function(){
          mounted = true
        }
      });
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            html: '<span class="injected"></span>',
            before: 'em'
          }, function(err){
            assert.ok(this.$el.children().eq(0).is('.injected'));
            assert.ok(this.$el.children().eq(1).is('em'));
            assert.ok(mounted)
            done(err)
          }, this)
        }
      });
    });
  });

  describe('after', function(){

    it('should inject after true', function(done){
      $('body').append('<div id="test"></div>');
      var mounted = false;
      app.bind('.injected', {
        life: { mount: 'mount' },
        mount: function(){
          mounted = true
        }
      });
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            html: '<span class="injected"></span>',
            after: true
          }, function(err){
            assert.ok(this.$el.next().is('.injected'));
            assert.ok(mounted)
            done(err)
          }, this)
        }
      });
    });

    it('should inject after selector', function(done){
      $('body').append('<div id="test"><em></em></div>');
      var mounted = false;
      app.bind('.injected', {
        life: { mount: 'mount' },
        mount: function(){
          mounted = true
        }
      });
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            html: '<span class="injected"></span>',
            after: 'em'
          }, function(err){
            assert.ok(this.$el.children().eq(0).is('em'));
            assert.ok(this.$el.children().eq(1).is('.injected'));
            assert.ok(mounted)
            done(err)
          }, this)
        }
      });
    });
  });

  describe('prepend', function(){

    it('should inject prepend true', function(done){
      $('body').append('<div id="test"><br></div>');
      var mounted = false;
      app.bind('.injected', {
        life: { mount: 'mount' },
        mount: function(){
          mounted = true
        }
      });
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            html: '<span class="injected"></span>',
            prepend: true
          }, function(err){
            assert.ok(this.$el.children().eq(0).is('.injected'));
            assert.ok(this.$el.children().eq(1).is('br'));
            assert.ok(mounted)
            done(err)
          }, this)
        }
      });
    });

    it('should inject prepend selector', function(done){
      $('body').append('<div id="test"><em><br></em></div>');
      var mounted = false;
      app.bind('.injected', {
        life: { mount: 'mount' },
        mount: function(){
          mounted = true
        }
      });
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            html: '<span class="injected"></span>',
            prepend: 'em'
          }, function(err){
            assert.ok(this.$('em').children().eq(0).is('.injected'));
            assert.ok(this.$('em').children().eq(1).is('br'));
            assert.ok(mounted)
            done(err)
          }, this)
        }
      });
    });
  });

  describe('append', function(){

    it('should inject append true', function(done){
      $('body').append('<div id="test"><br></div>');
      var mounted = false;
      app.bind('.injected', {
        life: { mount: 'mount' },
        mount: function(){
          mounted = true
        }
      });
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            html: '<span class="injected"></span>',
            append: true
          }, function(err){
            assert.ok(this.$el.children().eq(0).is('br'));
            assert.ok(this.$el.children().eq(1).is('.injected'));
            assert.ok(mounted)
            done(err)
          }, this)
        }
      });
    });

    it('should inject append selector', function(done){
      $('body').append('<div id="test"><em><br></em></div>');
      var mounted = false;
      app.bind('.injected', {
        life: { mount: 'mount' },
        mount: function(){
          mounted = true
        }
      });
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            html: '<span class="injected"></span>',
            append: 'em'
          }, function(err){
            assert.ok(this.$('em').children().eq(0).is('br'));
            assert.ok(this.$('em').children().eq(1).is('.injected'));
            assert.ok(mounted)
            done(err)
          }, this)
        }
      });
    });
  });

  describe('url', function(){

    it('should inject from url', function(done){
      $('body').append('<div id="test"></div>');
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            url: '/injectme.html',
            into: true
          }, function(err){
            assert.strictEqual(1, this.$('.injected').length);
            done(err)
          }, this)
        }
      });
    });

    it('should inject from url and selector', function(done){
      $('body').append('<div id="test"></div>');
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            url: '/injectme.html span',
            into: true
          }, function(err){
            assert.strictEqual(1, this.$('span').length);
            done(err)
          }, this)
        }
      });
    });
  });

  describe('errors', function(){

    it('should require target', function(done){
      $('body').append('<div id="test"></div>');
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            html: '<br>'
          }, function(err){
            assert.ok(err);
            done()
          }, this)
        }
      });
    });

    it('should require source', function(done){
      $('body').append('<div id="test"></div>');
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            into: true
          }, function(err){
            assert.ok(err);
            done()
          }, this)
        }
      });
    });

    it('should fail on not found', function(done){
      $('body').append('<div id="test"></div>');
      app.bind('#test', {
        life: { mount: 'mount' },
        mount: function(){
          this.inject({
            url: '/fake.html',
            into: true
          }, function(err){
            assert.ok(err);
            done()
          }, this)
        }
      });
    });
  });
});

describe('Navigation', function(){

  afterEach(function(){
    window.history.replaceState({}, '', '/');
  });

  it('should navigate', function(done){
    app.navigate('/navigate.html', function(err){
      done(err);
    });
  });

  it('should show title', function(done){
    assert.ok(document.title !== 'title foo')
    app.navigate('/navigate.html', function(err){
      assert.strictEqual('title foo', document.title)
      done(err);
    });
  });

  it('should update url', function(done){
    assert.ok(location.pathname !== '/navigate.html')
    app.navigate('/navigate.html', function(err){
      assert.strictEqual(location.pathname, '/navigate.html')
      done(err);
    });
  });

  it('should update content', function(done){
    assert.strictEqual(0, $('h1.the-heading').length)
    app.navigate('/navigate.html', function(err){
      assert.strictEqual('Test 1', $('h1.the-heading').text())
      done(err);
    });
  });

  it('should rescan', function(done){
    assert.strictEqual(0, $('h1.the-heading').length);
    app.bind('h1.the-heading', {
      life: { init: 'init' },
      init: function(){
        done();
      }
    });
    app.navigate('/navigate.html', function(err){
      assert.strictEqual('Test 1', $('h1.the-heading').text())
      err && done(err);
    });
  });

  it('should rescan before callback', function(done){
    var result = ''
    app.bind('h1.the-heading', {
      life: { init: 'init' },
      init: function(){
        result += 'a';
      }
    });
    app.navigate('/navigate.html', function(err){
      result += 'b';
      assert.equal('ab', result);
      done(err);
    });
  });

  it('should autofocus', function(done){
    app.navigate('/navigate.html', function(err){
      assert.strictEqual(document.activeElement, $('button').get(0))
      done(err);
    });
  });

  it('should run a script', function(done){
    assert.strictEqual(undefined, window.navigate2)
    app.navigate('/navigate2.html', function(err){
      assert.strictEqual(1, window.navigate2);
      done(err);
    });
  });

  it('should not run a script twice', function(done){
    assert.strictEqual(1, window.navigate2)
    app.navigate('/navigate2.html', function(err){
      assert.strictEqual(1, window.navigate2);
      done(err);
    });
  });

  it('should fail silently on abort', function(done){
    app.navigate('/navigate.html', function(err){
      done(new Error('did not fail silently'));
    });
    app.navigate('/navigate.html', function(err){
      done(err);
    });
  });

  it('should work for 404 not found', function(done){
    document.title = 'x';
    app.navigate('/fake.html', function(err){
      assert.ok(document.title !== 'x');
      done(err);
    });
  });

  it('should go back', function(done){
    app.on('revisit-end', function(err){
      assert.equal('title foo', document.title);
      assert.equal('/navigate.html', location.pathname);
      done(err);
    });
    app.navigate('/navigate.html', function(err){
      app.navigate('/fake.html', function(err){
        history.back();
      });
    });
  });

  it('should rescan after back', function(done){
    var count = 0;
    app.bind('h1.the-heading', {
      life: { init: 'init' },
      init: function(){
        assert.equal('/navigate.html', location.pathname);
        assert.equal('title foo', document.title);
        count++;
        if (count === 2){
          done();
        }
      }
    });
    app.navigate('/navigate.html', function(err){
      err && done(err)
      app.navigate('/fake.html', function(err){
        err && done(err)
        history.back();
      });
    });
  });

  it('should revisit start and end', function(done){
    var result = '';
    app.on('revisit-start', function(){
      result += 'a';
    });
    app.on('revisit-end', function(err){
      result += 'b';
      assert.equal('ab', result);
      done(err);
    });
    app.navigate('/navigate.html', function(err){
      history.back();
    });
  });

  it('should not break on hash', function(done){
    assert.strictEqual(0, $('h1.the-heading').length)
    app.navigate('/navigate.html#foo', function(err){
      assert.strictEqual('Test 1', $('h1.the-heading').text())
      assert.strictEqual('/navigate.html#foo', location.pathname + location.search + location.hash)
      done(err);
    });
  });

  it('should trigger body-change', function(done){
    app.on('body-change', function(oldBody, newBody){
      assert.equal(oldBody.nodeName.toLowerCase(), 'body')
      assert.equal(newBody.nodeName.toLowerCase(), 'body')
      assert.ok($.contains(document.documentElement, oldBody))
      assert.ok(!$.contains(document.documentElement, newBody))
      done()
    });
    app.navigate('/navigate.html', function(err){
      if (err) done(err);
    });
  });
});

describe('Events', function(){

  it('should work', function(done){
    app.on('foo', function(){
      done();
    });
    app.trigger('foo');
  });

  it('should work synchronously', function(){
    var ran = false;
    app.on('foo', function(){
      ran = true;
    });
    app.trigger('foo');
    assert.ok(ran)
  });

  it('should pass this', function(done){
    var ctx = {};
    app.on('foo', function(){
      assert.strictEqual(ctx, this);
      done()
    }, ctx);
    app.trigger('foo');
  });

  it('should pass args', function(done){
    var ctx = {};
    app.on('foo', function(a1, a2){
      assert.strictEqual(0, a1);
      assert.strictEqual(false, a2);
      done()
    }, ctx);
    app.trigger('foo', 0, false);
  });

  it('should work multiple', function(){
    var called = 0;
    app.on('foo', function(){
      called++;
    });
    app.trigger('foo');
    app.trigger('foo');
    assert.strictEqual(2, called)
  });

  it('off should work', function(){
    var called = 0;
    function inc(){called++}
    app.on('foo', inc);
    app.trigger('foo');
    app.off('foo', inc);
    app.trigger('foo');
    assert.strictEqual(1, called)
  });

  it('one should work', function(done){
    app.one('foo', function(){
      done();
    });
    app.trigger('foo');
  });

  it('one should work synchronously', function(){
    var ran = false;
    app.one('foo', function(){
      ran = true;
    });
    app.trigger('foo');
    assert.ok(ran)
  });

  it('one should pass this', function(done){
    var ctx = {};
    app.one('foo', function(){
      assert.strictEqual(ctx, this);
      done()
    }, ctx);
    app.trigger('foo');
  });

  it('one should pass args', function(done){
    var ctx = {};
    app.one('foo', function(a1, a2){
      assert.strictEqual(0, a1);
      assert.strictEqual(false, a2);
      done()
    }, ctx);
    app.trigger('foo', 0, false);
  });

  it('one should not work multiple', function(){
    var called = 0;
    app.one('foo', function(){
      called++;
    });
    app.trigger('foo');
    app.trigger('foo');
    assert.strictEqual(1, called)
  });
});







