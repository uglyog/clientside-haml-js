describe 'haml apis', () ->

  describe 'compileHaml', () ->

    hamlFixture = '%h1\n' +
      '  %div\n' +
      '    %p This is "some" text\n' +
      '      This is #{"some"} text\n' +
      '    This is some <div> text\n' +
      '    \\%span\n' +
      '    %span %h1 %h1 %h1\n'

    coffeeSource =  '''function (context) {
                    html = []
                    html.push('<h1>\\n  <div>\\n    <p>\\n      This is \\"some\\" text\\n')
                    html.push("      This is #{"some"} text\\n")
                    html.push('    </p>\\n    This is some <div> text\\n    %span\\n    <span>\\n      %h1 %h1 %h1\\n    </span>\\n  </div>\\n</h1>\\n')
                    return html.join("")
                    }
                    
                    '''

    beforeEach () ->
      setFixtures('<script type="text/template" id="simple">\n' +
        hamlFixture +
        '</script>')

    it 'should take a source parameter', () ->
      expect(haml.compileHaml(source: hamlFixture)()).toEqual(haml.compileStringToJs(hamlFixture)())

    it 'should take a sourceId parameter', () ->
      expect(haml.compileHaml(sourceId: 'simple')()).toEqual(haml.compileHaml('simple')())

    it 'should take a sourceUrl parameter', () ->
      expect(haml.compileHaml(sourceUrl: 'https://raw.github.com/uglyog/clientside-haml-js/master/spec/fixture.haml')()).toEqual(haml.compileHaml('simple')())
    
    it 'should take a outputFormat parameter', () ->
      expect(haml.compileHaml(source: hamlFixture, outputFormat: 'string')).toEqual(haml.compileHamlToJsString(hamlFixture))
      expect(typeof haml.compileHaml(source: hamlFixture, outputFormat: 'function')).toEqual('function')

    it 'should take a generator parameter', () ->
      expect(haml.compileHaml(source: hamlFixture, generator: 'javascript', outputFormat: 'string')).toEqual(haml.compileHamlToJsString(hamlFixture))
      expect(haml.compileHaml(source: hamlFixture, generator: 'coffeescript', outputFormat: 'string')).toEqual(coffeeSource)

