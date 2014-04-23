var gulp = require('gulp');
var source = require('vinyl-source-stream');
var watchify = require('watchify');
var server = require('./test/server');

gulp.task('default', ['develop','server']);

gulp.task('develop', function(){
  function rebundle(){
    return bundler.bundle({debug:true})
    .pipe(source('tests-bundle.js'))
    .pipe(gulp.dest('./test/server/public/generated/'));
  }
  var bundler = watchify({
    entries: ['./test/tests.js','./freeloader.js']
  });
  bundler.on('update', rebundle);
  return rebundle();
});

gulp.task('server', function(){
  var port = 9292;
  server.listen(port);
  console.log('server listening on ' + port);
});
