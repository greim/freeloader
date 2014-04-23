var gulp = require('gulp');
var source = require('vinyl-source-stream');
var watchify = require('watchify');
var server = require('./test/server');

gulp.task('default', ['dev']);

gulp.task('dev', ['dev-tests','dev-sandbox']);

gulp.task('dev-tests', ['server'], function(){
  function rebundle(){
    return bundler.bundle({debug:true})
    .pipe(source('tests-bundle.js'))
    .pipe(gulp.dest('./test/server/public/generated/'));
  }
  var bundler = watchify('./test/tests.js');
  bundler.on('update', rebundle);
  return rebundle();
});

gulp.task('dev-sandbox', ['server'], function(){
  function rebundle(){
    return bundler.bundle({debug:true})
    .pipe(source('sandbox.js'))
    .pipe(gulp.dest('./test/server/public/generated/'));
  }
  var bundler = watchify('./test/server/public/sandbox/sandbox.js');
  bundler.on('update', rebundle);
  return rebundle();
});

gulp.task('server', function(){
  var port = 9292;
  server.listen(port);
  console.log('server listening on ' + port);
});
