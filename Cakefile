fs     = require 'fs'
{exec} = require 'child_process'

appFiles  = [
  'src/tokiniser.coffee',
  'src/buffer.coffee',
  'src/jscodegenerator.coffee',
  'src/coffeecodegenerator.coffee',
  'src/hamlruntime.coffee',
  'src/haml.coffee'
]

task 'build', 'Build haml.js', ->
  exec "coffee -c -j lib/haml.js #{appFiles.join(' ')} ", (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr
  exec "uglifyjs -o lib/haml.min.js lib/haml.js", (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr
    