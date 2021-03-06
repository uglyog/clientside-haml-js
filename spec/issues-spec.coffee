describe 'haml issues', ->

  describe 'Issue #2 - Anonymous functions should pass through \'this\'', ->

    beforeEach () ->
      setFixtures('<script type="text/template" id="anonymous">\n' +
        '.test = this.fnOnThis()\n' +
        '.test2 = fnOnThis()\n' +
        '</script>'
      )

    for generator in ['javascript', 'productionjavascript']
      do (generator) ->
        it 'should the correct html for ' + generator, ->
          that = { fnOnThis: () -> return 'TEST' }
          context = { fnOnThis: () -> return 'TEST2' }
          html = haml.compileHaml(sourceId: 'anonymous', generator: generator).call(that, context)
          expect(html).toEqual(
            '\n<div class="test">\n' +
            '  TEST\n' +
            '</div>\n' +
            '<div class="test2">\n' +
            '  TEST2\n' +
            '</div>\n')

  describe 'Issue #6 - Empty lines should be ignored', ->

    beforeEach () ->
      setFixtures('<script type="text/template" id="empty-lines">\n' +
        '%div\n' +
        '  %div\n' +
        '    %div\n' +
        '    \n' +
        '    %div\n' +
        '  \n' +
        '    %div' +
        '\n' +
        '    %div' +
        '</script>')

    it 'should render the correct html', ->
      html = haml.compileHaml('empty-lines')()
      expect(html).toEqual(
        '\n<div>\n' +
        '  <div>\n' +
        '    <div>\n' +
        '    \n' +
        '    </div>\n' +
        '    <div>\n' +
        '  \n' +
        '    </div>\n' +
        '    <div>\n' +
        '    </div>\n' +
        '    <div>\n' +
        '    </div>\n' +
        '  </div>\n' +
        '</div>\n')

  describe 'Issue #14 - rendering null values', ->

    beforeEach () ->
      setFixtures('<script type="text/template" id="null-js-values">\n' +
        '.inline-null\n' +
        '  = null;\n' +
        '.null-evaluating\n' +
        '  = nullValue;\n' +
        '.embedded-null= null\n' +
        '</script>')

    for generator in ['javascript', 'productionjavascript']
      do (generator) ->
        it 'should render null values as a string for ' + generator, () ->
          html = haml.compileHaml(sourceId: 'null-js-values', generator: generator)({nullValue: null})
          expect(html).toEqual(
            '\n<div class="inline-null">\n' +
            '  \n' +
            '</div>\n' +
            '<div class="null-evaluating">\n' +
            '  \n' +
            '</div>\n' +
            '<div class="embedded-null">\n' +
            '  \n' +
            '</div>\n')

  describe 'Issue 13 - comments', ->

    beforeEach () ->
      setFixtures('<script type="text/template" id="comment-issue">\n' +
        '#div1\n' +
        '  -# if blahDiBlah\n' +
        '    #shouldNotRender\n' +
        '      .shouldAlsoNotRender\n' +
        '        You should not see me\n' +
        '  You should see me\n' +
        '-# #div2\n' +
        '  I\'m Invisible!\n' +
        '#div3\n' +
        '  You should see me\n' +
        '</script>')

    it 'should render the correct html', () ->
      html = haml.compileHaml('comment-issue')()
      expect(html).toEqual(
        '\n<div id="div1">\n' +
        '  You should see me\n' +
        '</div>\n' +
        '<div id="div3">\n' +
        '  You should see me\n' +
        '</div>\n')

  describe 'Issue #21 - text node followed by tag node fails', ->

    hex = (str) ->
      _((_.str || _).chars(str)).map((ch) -> (_.str || _).pad(ch.charCodeAt(0).toString(16), 2, '0')).join('')

    it 'should no fail to generate a js function due to newlines', ->

      setFixtures(
        '''<script type="text/template" id="issue-21">
        %div
        text
        %p 123
        </script>
        '''
      )

      html = haml.compileHaml(sourceId: 'issue-21')()
      expect(html).toEqual(
        '''

        <div>
        </div>
        text
        <p>
          123
        </p>

        '''
      )

    it "should handle Unix line endings", () ->
      source = "\u000A%div\u000Atext\u000A%p 123\u000A"
      html = haml.compileHaml(source: source)()
      expect(html).toEqual("\n<div>\n</div>\ntext\n<p>\n  123\n</p>\n")

    it "should handle Windows line endings", () ->
      source = "\u000D\u000A%div\u000D\u000Atext\u000D\u000A%p 123\u000D\u000A"
      html = haml.compileHaml(source: source)()
      expect(hex(html)).toEqual(hex("\r\n<div>\n</div>\ntext\r\n<p>\n  123\r\n</p>\n"))

    it "should handle endings in any order", () ->
      source = "\u000D\u000A%div\u000A\u000Dtext\u000D%p 123\u000D\u000A"
      html = haml.compileHaml(source: source)()
      expect(hex(html)).toEqual(hex("\r\n<div>\n</div>\n\rtext\r%p 123\r\n"))

  describe 'Issue #24 - inconsistent indent handling', ->

    it 'should handle indentation modulo 2', ->
      expected = '''<table>
                   <tr>
                   </tr>
                 </table>

                 '''
      html = haml.compileHaml(source: '%table\n\t%tr')()
      expect(html).toEqual(expected)
      html = haml.compileHaml(source: '%table\n %tr')()
      expect(html).toEqual(expected)
      html = haml.compileHaml(source: '%table\n  %tr')()
      expect(html).toEqual(expected)

    it 'should count tabs as 2 characters', ->
      expected = '''<table>
                      <tr>
                        <td>
                        </td>
                      </tr>
                    </table>

                 '''
      html = haml.compileHaml(source: '%table\n\t%tr\n\t\t%td')()
      expect(html).toEqual(expected)

  describe 'Issue #25 - Incorrect coffeescript indentation', ->

    it 'should indent the lines within logic blocks correctly', ->
      hamlSource =
        '''
           -if true
             %a{href : '#new'} create new
        '''
      expected =
        '''
           <a href="#new">
               create new
             </a>
        '''
      expect(_.str.trim(haml.compileHaml(source: hamlSource, generator: 'coffeescript')())).toEqual(expected)

  describe 'Issue #27 - multiple levels of nesting confuses haml parser', ->

    it 'should indent the lines within logic blocks correctly', ->
      hamlSource =
        '''
           %ul{"class":"nav nav-tabs"}
             - for player in @players
               %li
                 %a{'href':"#player#{player.id}", "data-toggle":"tab"}
                   = player.get("name")
        '''
      expected =
        '''
           <ul class="nav nav-tabs">
               <li>
                 <a href="#player1" data-toggle="tab">
                   travis
                 </a>
               </li>
           </ul>
        '''
      players = [
        {id: 1, name: 'travis', get: (attr) -> @name}
      ]
      expect(_.str.trim(haml.compileHaml(source: hamlSource, generator: 'coffeescript').call(players: players))).toEqual(expected)

  describe 'Issue #30 - if/else statements don\'t work for embedded coffeescript', ->

    it 'should be able to handle else statements', () ->
      hamlSource =
        '''
        -for option in @options
          - if option.value == @selected
            = option.text
          - else
            .unselected
              = option.text
        '''
      expected =
        '''
        text 1
            <div class="unselected">
              text 2
            </div>
            <div class="unselected">
              text 3
            </div>
        '''
      options = [
        {value: '1', text: 'text 1'},
        {value: '2', text: 'text 2'},
        {value: '3', text: 'text 3'}
      ]
      expect(_.str.trim(haml.compileHaml(source: hamlSource, generator: 'coffeescript').call(options: options, selected: '1'))).toEqual(expected)

  it 'should be able to handle else statements with extra ifs', ->
      hamlSource =
        '''
        -for option in @options
          - if option.value == @selected
            = option.text
            - if false
              false
            - else
              true
          - else
            .unselected
              = option.text
        '''
      expected =
        '''
        text 1
              true
            <div class="unselected">
              text 2
            </div>
            <div class="unselected">
              text 3
            </div>
        '''
      options = [
        {value: '1', text: 'text 1'},
        {value: '2', text: 'text 2'},
        {value: '3', text: 'text 3'}
      ]
      expect(_.str.trim(haml.compileHaml(source: hamlSource, generator: 'coffeescript').call(options: options, selected: '1'))).toEqual(expected)

  describe 'Issue #29 - backslash when escaping ampersand character appears in DOM', ->

    it 'should not be excluding the bashslashed character', ->

      hamlSource =
        '''
          %p
            \\&copy; Company 2012
        '''
      expected =
        '''
          <p>
            &copy; Company 2012
          </p>
        '''
      expect(_.str.trim(haml.compileHaml(source: hamlSource)())).toEqual(expected)

  describe 'Issue #31 - new line in eval breaking generated function', ->

    it 'should not blow up', ->

      hamlSource =
        '''
          %div{class: 'hero-unit'}
            %h2= email.subject
            %iframe{class: 'email-preview', src: iframeSource}
        '''
      expected =
        '''
          <div class="hero-unit">
            <h2>
              Issue #31
            </h2>
            <iframe class="email-preview" src="blahblahblah">
            </iframe>
          </div>
        '''

      data = {
        email: {subject: 'Issue #31'},
        iframeSource: 'blahblahblah'
      }

      expect(_.str.trim(haml.compileHaml(source: hamlSource)(data))).toEqual(expected)

  describe 'Issue #34 - Haml does not format attributes which are 3 or more layers deep correctly', ->

    it 'should handle nested hashes correctly', ->
      expect(_.str.trim(haml.compileHaml(source: '%a{data:{theme:{test:"A"}}}<')())).toEqual('<a data-theme-test="A"></a>')
      expect(_.str.trim(haml.compileHaml(source: '.foo{data: {a: "b", c: {d: "e", f: "g"}}}<')())).toEqual('<div class="foo" data-a="b" data-c-d="e" data-c-f="g"></div>')


  describe 'Issue #37 - Unexpected behavior', ->

    it 'should render correctly', ->

      hamlSource =
        '''
          .content Hello World!

          %div{class:"hi"}
            = hello

          %span[obj1]
            wtf?
        '''
      expected =
        '''
        <div class="content">
        Hello World!

        </div>
        <div class="hi">
          I&#39;m a variable!

        </div>
        <span id="object-1" class="test">
          wtf?
        </span>
        '''

      data =
        hello: "I'm a variable!"
        obj1: {id: "object-1", class: "test"}

      expect(_.str.trim(haml.compileHaml(source: hamlSource)(data))).toEqual(expected)

  describe 'Issue #38 - Whitespace not calculated correctly when only using tabs for indentation', ->

    it 'should calculate indentation with tabs correctly', ->

      hamlSource = ".page\n\t.row\n\t\t%section\n\t\t\t%h5 header\n\t\t\t%p\n\t\t\t\t%span foobar"
      expected =
        '''
        <div class="page">
          <div class="row">
            <section>
              <h5>
                header
              </h5>
              <p>
                <span>
                  foobar
                </span>
              </p>
            </section>
          </div>
        </div>
        '''

      expect(_.str.trim(haml.compileHaml(source: hamlSource)())).toEqual(expected)