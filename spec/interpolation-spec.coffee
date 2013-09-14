describe 'interpolated text', () ->

  it 'should allow code to be interpolated within plain text using #{}', () ->
    expect(
      haml.compileStringToJs('%p This is #{quality} cake! #{"Yay!"}')(quality: 'scrumptious')
    ).toEqual(
      '''
      <p>
        This is scrumptious cake! Yay!
      </p>
      
      '''
    )

  it 'should handle escaped markers', () ->
    expect(
      haml.compileStringToJs(
        '''
           %p
             Look at \\\\#{h(word)} lack of backslash: \\#{foo}
             And yon presence thereof: \\{foo}
        '''
      )(h: ((word) -> word.toLowerCase()), word: 'YON')
    ).toEqual(
        '''
           <p>
             Look at \\\\yon lack of backslash: #{foo}
             And yon presence thereof: \\{foo}
           </p>
           
        '''
    )

  it 'generates filter blocks correctly', () ->
    expect(
      haml.compileStringToJs(
        '''
        %body
          :javascript
            $(document).ready(function() {
              alert("#{message}");
            });
          %p
            :preserve
              Foo
              #{"<pre>Bar\\nBaz</pre>"}
              <a>Test
              Test
              </a>
              Other
            :escaped
              Foo
              #{"<pre>'Bar'\\nBaz</pre>"}
              <a>Test
              Test
              </a>
              Other&
        '''
      )(message: 'Hi there!')
    ).toEqual(
      '''
      <body>
        <script type="text/javascript">
          //<![CDATA[
            $(document).ready(function() {
              alert("Hi there!");
            });
          //]]>
        </script>
        <p>
          Foo&#x000A; <pre>Bar\nBaz</pre>&#x000A; <a>Test&#x000A; Test&#x000A; </a>&#x000A; Other
          Foo
          &lt;pre&gt;&#39;Bar&#39;
      Baz&lt;/pre&gt;
          &lt;a&gt;Test
          Test
          &lt;/a&gt;
          Other&amp;
        </p>
      </body>
      
      '''
    )

  it 'should support interpolation in coffeescript', () ->
    expect(
      haml.compileCoffeeHamlFromString(
        '''
        - h = (word) -> word.toLowerCase()
        %p
          Look at \\\\#{h @word } lack of backslash: \\#{foo}
          And yon presence thereof: \\{foo}
        '''
      ).call(word: 'YON')
    ).toEqual(
      '''
      <p>
        Look at \\\\yon lack of backslash: #{foo}
        And yon presence thereof: \\{foo}
      </p>

      '''
    )

  it 'generates filter blocks correctly with embedded coffeescript', () ->
    expect(
      haml.compileCoffeeHamlFromString(
        '''
        %body
          :javascript
            $(document).ready(function() {
              alert("#{@message}");
            });
          %p
            :preserve
              Foo
              #{"<pre>Bar\\nBaz</pre>"}
              <a>Test
              Test
              </a>
              Other
            :escaped
              Foo
              #{"<pre>'Bar'\\nBaz</pre>"}
              <a>Test
              Test
              </a>
              Other&
        '''
      ).call(message: 'Hi there!')
    ).toEqual(
      '''
      <body>
        <script type="text/javascript">
          //<![CDATA[
            $(document).ready(function() {
              alert("Hi there!");
            });
          //]]>
        </script>
        <p>
          Foo&#x000A; <pre>Bar\nBaz</pre>&#x000A; <a>Test&#x000A; Test&#x000A; </a>&#x000A; Other
          Foo
          &lt;pre&gt;&#39;Bar&#39;
      Baz&lt;/pre&gt;
          &lt;a&gt;Test
          Test
          &lt;/a&gt;
          Other&amp;
        </p>
      </body>
      
      '''
    )
