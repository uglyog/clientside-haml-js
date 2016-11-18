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

task 'build', 'Build haml.js', ->
  exec "coffee -c -m -j lib/haml.js #{appFiles.join(' ')} ", (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr
  exec "uglifyjs -o lib/haml.min.js lib/haml.js", (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr
