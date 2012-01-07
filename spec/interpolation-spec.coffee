describe 'interpolated text', () ->

  it 'should allow code to be interpolated within plain text using #{}', () ->
    expect(
      haml.compileStringToJs('%p This is #{quality} cake!')(quality: 'scrumptious')
    ).toEqual(
      '''<p>This is scrumptious cake!</p>'''
    )

  it 'should handle escaped markers', () ->
    expect(
      haml.compileStringToJs(
        '''
           %p
             Look at \\#{h(word)} lack of backslash: \#{foo}
             And yon presence thereof: \{foo}
        '''
      )(h: ((word) -> word.reverse()), word: 'noy')
    ).toEqual(
        '''
           <p>
             Look at \yon lack of backslash: #{foo}
             And yon presence thereof: \{foo}
           </p>
        '''
    )

  it 'generates javascript filter blocks correctly', () ->
    expect(
      haml.compileStringToJs(
        '''
        %body
          :javascript
            $(document).ready(function() {
              alert("#{message}");
            });
        '''
      )(message: 'Hi there!')
    ).toEqual(
      '''
         <body>
           <script type='text/javascript'>
            //<![CDATA[
              $(document).ready(function() {
                alert("Hi there!");
              });
            //]]>
           </script>
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