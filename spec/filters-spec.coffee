describe 'filters', () ->

  beforeEach () ->
      setFixtures(
        '''<script type="text/template" id="plain-filter">
           %h1
             %p
               :plain
                 Does not parse the filtered text. This is useful for large blocks of text without HTML tags,
                 when you don't want lines starting with . or - to be parsed.
             %span Other Contents
           </script>
        '''
      )

  it 'should render the result of the filter function', () ->
    html = haml.compileHaml('plain-filter')()
    expect(html).toEqual(
      '''

      <h1>
        <p>
          Does not parse the filtered text. This is useful for large blocks of text without HTML tags,
          when you don't want lines starting with . or - to be parsed.
        </p>
        <span>
          Other Contents
        </span>
      </h1>

      '''
    )

  it 'should raise an error if the filter is not found', () ->
    expect(() ->
      haml.compileStringToJs(
        '''
        %p
          :unknown
            blah di blah di blah
        '''
      )
    ).toThrow(
      '''Filter 'unknown' not registered. Filter functions need to be added to 'haml.filters'. at line 2 and character 10:
           :unknown
         ---------^'''
    )

  it 'generates javascript filter blocks correctly', () ->
    expect(
      haml.compileCoffeeHamlFromString(
        '''
        %body
          :javascript
            // blah di blah di blah
            function () {
              return 'blah';
            }
        '''
      )()
    ).toEqual(
      '''
         <body>
           <script type="text/javascript">
           //<![CDATA[
           // blah di blah di blah
           function () {
             return 'blah';
           }
           //]]>
           </script>
         </body>

      '''
    )

  it 'generates css filter blocks correctly', () ->
    expect(
      haml.compileStringToJs(
        '''
        %head
          :css
            /* blah di blah di blah */
            .body {
              color: red;
            }
        '''
      )()
    ).toEqual(
      '''
         <head>
           <style type="text/css">
           /*<![CDATA[*/
           /* blah di blah di blah */
           .body {
             color: red;
           }
           /*]]>*/
           </style>
         </head>

      '''
    )

  it 'generates CDATA filter blocks correctly', () ->
    expect(
      haml.compileStringToJs(
        '''
        %body
          :cdata
            // blah di blah di blah
            function () {
              return 'blah';
            }
        '''
      )()
    ).toEqual(
      '''
         <body>
           <![CDATA[
           // blah di blah di blah
           function () {
             return 'blah';
           }
           ]]>
         </body>

      '''
    )

  it 'generates preserve filter blocks correctly', () ->
    expect(
      haml.compileStringToJs(
        '''
        %p
          :preserve
            Foo
            <pre>Bar
            Baz</pre>
            <a>Test
            Test
            </a>
            Other
        '''
      )()
    ).toEqual(
      '''
         <p>
         Foo
         <pre>Bar&#x000A;Baz</pre>
         <a>Test&#x000A;Test&#x000A;</a>
         Other
         </p>

      '''
    )


  it 'generates escape filter blocks correctly', () ->
    expect(
      haml.compileStringToJs(
        '''
        %p
          :escape
            Foo
            <pre>'Bar'
            Baz</pre>
            <a>Test
            Test
            </a>
            Other&
        '''
      )()
    ).toEqual(
      '''
         <p>
           Foo
           &lt;pre&gt;&#39;Bar&#39;
           Baz&lt;/pre&gt;
           &lt;a&gt;Test
           Test
           &lt;/a&gt;
           Other&amp;
         </p>

      '''
    )