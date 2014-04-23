var gulp = require('gulp');
var source = require('vinyl-source-stream');
var watchify = require('watchify');

gulp.task('default', ['develop']);
gulp.task('develop', function(){
  function rebundle(){
    return bundler.bundle({debug:true})
    .pipe(source('tests-bundle.js'))
    .pipe(gulp.dest('./test/dist'));
  }
  var bundler = watchify({
    entries: ['./test/tests.js','./freeloader.js']
  });
  bundler.on('update', rebundle);
  return rebundle();
});
