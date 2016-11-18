fs     = require 'fs'
{exec} = require 'child_process'

appFiles  = [
  'src/header.coffee',
  'src/hamlruntime.coffee',
  'src/tokiniser.coffee',
  'src/buffer.coffee',
  'src/codegenerator.coffee',
  'src/jscodegenerator.coffee',
  'src/productionjscodegenerator.coffee',
  'src/coffeecodegenerator.coffee',
  'src/elementgenerator.coffee',
  'src/filters.coffee',
  'src/haml.coffee'
]

specFiles = [
  'spec/haml-spec.coffee',
  'spec/filters-spec.coffee',
  'spec/interpolation-spec.coffee',
  'spec/haml-api-spec.coffee',
  'spec/issues-spec.coffee',
  'spec/haml-runtime-spec.coffee',
  'spec/buffer-spec.coffee',
  'spec/code-generation-spec.coffee',
  'spec/error-handling-spec.coffee'
  'spec/element-generation-spec.coffee'
]

task 'build', 'Build haml.js', ->
  exec "coffee -c -m -j lib/haml.js #{appFiles.join(' ')} ", (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr
  exec "coffee -c -m -j spec/haml-spec.js #{specFiles.join(' ')} ", (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr
  exec "uglifyjs -o lib/haml.min.js lib/haml.js", (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr
