fs     = require 'fs'
{exec} = require 'child_process'

appFiles  = [
  'lib/tokiniser.coffee',
  'lib/buffer.coffee',
  'lib/jscodegenerator.coffee',
  'lib/hamlruntime.coffee',
  'lib/haml.coffee'
]

task 'build', 'Build haml.js', ->
  exec "coffee -c -j lib/haml.js #{appFiles.join(' ')} ", (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr
    