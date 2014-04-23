var freeloader = require('../freeloader');
var $ = require('jquery-browserify');

var app = freeloader();

function assert(thing, message){
  if (!thing) throw new Error(message || 'failed assertion');
}

function cr(selId, content){
  var id = selId.substring(1);
  var div = document.createElement('div');
  div.id = id;
  div.innerHTML = content || '';
  document.body.appendChild(div);
  return selId;
}

describe('Controller', function(){
  it('should init without error', function(done){
    app.bind(cr('#test1'), {
      init: function(){
        done();
      }
    });
  });
  it('should init without error on dupe elements', function(done){
    app.bind(cr('#test2'), {
      init: function(){
        done();
      }
    });
  });
  it('should init without error, using extend', function(done){
    app.bind(cr('#test3'), freeloader.Controller.extend({
      init: function(){
        done();
      }
    }));
  });
  it('should have correct this', function(done){
    var MyController = freeloader.Controller.extend({
      init: function(){
        if (this instanceof MyController){
          done();
        } else {
          done(new Error('wrong context'));
        }
      }
    });
    app.bind(cr('#test4'), MyController);
  });
  it('should have an el property', function(done){
    app.bind(cr('#test5'), {
      init: function(){
        if (!this.el){
          done(new Error('no el property'));
        } else if (!this.el.nodeType) {
          done(new Error('no nodeType on el property'));
        } else if (this.el.nodeType !== 1) {
          done(new Error('el property is not an element'));
        } else if (!$.contains(document.documentElement, this.el)) {
          done(new Error('el property is not contained by document'));
        } else {
          done();
        }
      }
    });
  });
  it('should have an $el property', function(done){
    app.bind(cr('#test6'), {
      init: function(){
        if (!this.$el){
          done(new Error('no $el property'));
        } else if (!(this.$el instanceof $)) {
          done(new Error('$el is not a jQuery instance'));
        } else {
          done();
        }
      }
    });
  });
  it('should have a working $el property', function(done){
    app.bind(cr('#test7'), {
      init: function(){
        if (this.$el.length !== 1){
          done(new Error('$el contains wrong number of things'));
        } else {
          done();
        }
      }
    });
  });
  it('should have a $ property', function(done){
    app.bind(cr('#test8'), {
      init: function(){
        if (!this.$){
          done(new Error('no $ property'));
        } else if (typeof this.$ !== 'function') {
          done(new Error('$ is not a function'));
        } else {
          done();
        }
      }
    });
  });
  it('should have a working $ property', function(done){
    app.bind(cr('#test9','<a href=""></a>'), {
      init: function(){
        var $a = this.$('a[href]');
        if ($a.length !== 1){
          done(new Error("$ property didn't work"));
        } else {
          done();
        }
      }
    });
  });
});
describe('Controller inheritance', function(){
  it('should inherit', function(done){
    var MyController = freeloader.Controller.extend({
      foo: function(){}
    });
    var MyController2 = MyController.extend({
      bar: function(){}
    });
    var MyController3 = MyController2.extend({
      baz: function(){}
    });
    app.bind(cr('#inheritance'), MyController3.extend({
      init: function(){
        assert(typeof this.foo === 'function');
        assert(typeof this.bar === 'function');
        assert(typeof this.baz === 'function');
        done();
      }
    }));
  });
});

describe('Controller DOM events', function(){
  it('should accept empty event objects without error', function(done){
    app.bind(cr('#test10'), {
      events: {},
      init: function(){
        done();
      }
    });
  });
  it('should accept non-empty event objects without error', function(done){
    app.bind(cr('#test11','<a href=""></a>'), {
      events: {'click a[href]':'handleClick'},
      init: function(){
        done();
      }
    });
  });
  it('should handle a direct DOM event', function(done){
    app.bind(cr('#test12'), {
      events: {'click':'handleClick'},
      init: function(){
        this.$el.trigger('click');
      },
      handleClick: function(){
        done();
      }
    });
  });
  it('should handle a delegated DOM event', function(done){
    app.bind(cr('#test13','<a href=""></a>'), {
      events: {'click a[href]':'handleClick'},
      init: function(){
        this.$('a[href]').trigger('click');
      },
      handleClick: function(){
        done();
      }
    });
  });
  it('should have correct params in DOM handler', function(done){
    app.bind(cr('#test14','<a href=""></a>'), {
      events: {'click a[href]':'handleClick'},
      init: function(){
        this.self = this;
        this.$('a[href]').trigger('click');
      },
      handleClick: function(ev){
        try {
          ev.preventDefault();
          this.self.self;
        } catch(err) {
          done(err);
        }
        done();
      }
    });
  });
});

describe('Controller subscriptions', function(){
  it('should accept empty subs objects without error', function(done){
    app.bind(cr('#test15'), {
      subs: {},
      init: function(){
        done();
      }
    });
  });
  it('should accept non-empty subs objects without error', function(done){
    app.bind(cr('#test16'), {
      subs: {'foo':'foo'},
      init: function(){
        done();
      }
    });
  });
  it('should work globally', function(done){
    app.bind(cr('#test18'), {
      subs: {'baz1':'baz1'},
      init: function(){
        app.publish('baz1','a',0);
      },
      baz1: function(ev, arg1, arg2){
        assert(ev, 'no event arg');
        assert(!ev.source, "event shouldn't have source");
        assert(ev.type === 'baz1', 'event type was wrong');
        assert(arg1 === 'a', 'arg1 was wrong');
        assert(arg2 === 0, 'arg2 was wrong');
        done();
      }
    });
  });
  it('should work locally', function(done){
    app.bind(cr('#test20'), {
      subs: {'baz3':'baz3'},
      init: function(){
        this.publish('baz3','a',0);
      },
      baz3: function(ev, arg1, arg2){
        assert(ev, 'no event arg');
        assert(ev.source === this, "event had wrong source");
        assert(ev.type === 'baz3', 'event type was wrong');
        assert(arg1 === 'a', 'arg1 was wrong');
        assert(arg2 === 0, 'arg2 was wrong');
        done();
      }
    });
  });
});

describe('Controller comms', function(){
  it('should accept empty comms objects without error', function(done){
    app.bind(cr('#test21'), {
      above: {},
      below: {},
      init: function(){
        done();
      }
    });
  });
  it('should accept non-empty comms objects without error', function(done){
    app.bind(cr('#test22'), {
      above: {x:'foo'},
      below: {y:'bar'},
      init: function(){
        done();
      }
    });
  });
  it('should send upward', function(done){
    cr('#nested-outer1','<div id="nested-inner1"></div>');
    app.bind('#nested-outer1', {
      below: {'x':'foo'},
      foo: function(ev, a, b){
        assert(ev, 'no event');
        assert(ev.type === 'x', 'wrong type');
        assert(a === null, 'wrong arg a');
        assert(b === 'null', 'wrong arg b');
        done();
      }
    });
    app.bind('#nested-inner1', {
      init: function(){
        this.up('x', null, 'null');
      }
    });
  });
  it('should send downward', function(done){
    cr('#nested-outer2','<div id="nested-inner2a"></div><div id="nested-inner2b"></div>');
    app.bind('#nested-inner2a', {
      above: {'x':'foo'},
      foo: function(ev, a, b){
        assert(ev, 'no event');
        assert(ev.type === 'x', 'wrong type');
        assert(a === null, 'wrong arg a');
        assert(b === 'null', 'wrong arg b');
      }
    });
    app.bind('#nested-inner2b', {
      above: {'x':'foo'},
      foo: function(ev, a, b){
        assert(ev, 'no event');
        assert(ev.type === 'x', 'wrong type');
        assert(a === null, 'wrong arg a');
        assert(b === 'null', 'wrong arg b');
        done();
      }
    });
    app.bind('#nested-outer2', {
      init: function(){
        this.down('x', null, 'null');
      }
    });
  });
});

describe('Controller content manip', function(){
  it('should have working html method', function(done){
    app.bind('#html-test-inner', {
      init: function(){
        done();
      }
    });
    app.bind(cr('#html-test'), {
      init: function(){
        this.html('<div id="html-test-inner"></div>');
      }
    });
  });
  it('should have working prepend method', function(done){
    app.bind('#prepend-test-inner', {
      init: function(){
        assert(this.$el.next().is('br'), 'prepend did not work');
        done();
      }
    });
    app.bind(cr('#prepend-test','<br>'), {
      init: function(){
        this.prepend('<div id="prepend-test-inner"></div>');
      }
    });
  });
  it('should have working append method', function(done){
    app.bind('#append-test-inner', {
      init: function(){
        assert(this.$el.prev().is('br'), 'prepend did not work');
        done();
      }
    });
    app.bind(cr('#append-test','<br>'), {
      init: function(){
        this.append('<div id="append-test-inner"></div>');
      }
    });
  });
});

describe('Content loading', function(){
  it('should load', function(done){
    app._load('/test1.html', function(err, doc){
      assert(doc.title === 'Test 1','wrong title');
      done();
    });
  });
  it('should handle error', function(done){
    app._load('/missing.html', function(err, doc){
      assert(err,'missing error');
      assert(err.status === 404,'wrong status');
      done();
    });
  });
});
