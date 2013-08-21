describe 'haml apis', () ->

  describe 'compileHaml', () ->

    hamlFixture = '%h1\n' +
      '  %div\n' +
      '    %p This is "some" text\n' +
      '      This is #{"some"} text\n' +
      '    This is some <div> text\n' +
      '    \\%span\n' +
      '    %span %h1 %h1 %h1\n'

    result =
      '''
      <h1>
        <div>
          <p>
            This is "some" text
            This is some text
          </p>
          This is some <div> text
          %span
          <span>
            %h1 %h1 %h1
          </span>
        </div>
      </h1>

      '''

    coffeeSource =  '''function (context) {
                    handleError = haml.HamlRuntime._raiseError
                    html = []
                    html.push('<h1>\\n  <div>\\n    <p>\\n      This is \\"some\\" text\\n')
                    html.push("      This is #{"some"} text")
                    html.push('\\n    </p>\\n    This is some <div> text\\n    %span\\n    <span>\\n      %h1 %h1 %h1\\n    </span>\\n  </div>\\n</h1>\\n')
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
      spyOn(jQuery, 'ajax').andCallFake (params) ->
        params.success(hamlFixture)
      expect(haml.compileHaml(sourceUrl: 'http://localhost:8080/clientside-haml-js/spec/fixture.haml')()).toEqual(result)

    it 'should take a outputFormat parameter', () ->
      expect(haml.compileHaml(source: hamlFixture, outputFormat: 'string')).toEqual(haml.compileHamlToJsString(hamlFixture))
      expect(typeof haml.compileHaml(source: hamlFixture, outputFormat: 'function')).toEqual('function')

    it 'should take a generator parameter', () ->
      expect(haml.compileHaml(source: hamlFixture, generator: 'javascript', outputFormat: 'string')).toEqual(haml.compileHamlToJsString(hamlFixture))
      expect(haml.compileHaml(source: hamlFixture, generator: 'coffeescript', outputFormat: 'string')).toEqual(coffeeSource)

