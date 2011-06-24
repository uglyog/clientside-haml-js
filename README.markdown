# Client-side HAML compiler in Javascript

The clientside-haml-js is a compiler written in Javascript that compiles text templates in HAML format into Javascript
functions that generate HTML. It has been inspired by the server side haml Javascript project
https://github.com/creationix/haml-js, and has been written to be feature compatible with Ruby server side HAML
http://haml-lang.com/docs/yardoc/file.HAML_REFERENCE.html, supports all major browsers (IE 7+, Firefox 3.6+,
Chrome 10+, Safari), have minimal dependencies (only [https://github.com/edtsech/underscore.string][underscore.js]
and [https://github.com/edtsech/underscore.string][underscore.string.js]).

# To use it

* Include the haml.js in your page:

```javascript
    <script type="text/javascript" src="js/haml.js"></script>
```

* The HAML templates will have to be added to the body of the web page in a script tag, and have a unique ID.

```html
    <script type="text/haml-template" id="simple">
    %h1
      %div
        %p
        %span
    </script>
```

* To compile the haml template into a Javascript function, call the haml.compileHaml function, providing it with the ID of the template.

```javascript
    haml.compileHaml('simple')
```

This will produce the following Javascript function:

```javascript
    function anonymous(context) {
      with(context) {
        var html = "";
        html += "<h1>\n  <div>\n    <p>\n    </p>\n    <span>\n    </span>\n  </div>\n</h1>\n";
        return html;
      }
    }
```

* The function can be called, and it takes one parameter: a context object.

```javascript
    var fn = haml.compileHaml('simple');
    var html = fn({});
```

This will produce the following HTML:

```html
    <h1>
      <div>
        <p>
        </p>
        <span>
        </span>
      </div>
    </h1>
```

# Client-side HAML Flavour

Although I tried keep the implementation as close to the Ruby one as possible, there are some differences. Also,
currently not all features are implemented.

## Element Attributes with {}

Elements with {} attributes are evaluated at runtime as Javascript code. This is similar to the ruby implementation,
but with Javascript code instead of Ruby. Values that result to null or false are excluded, and 'checked', 'selected' and
'disabled' attributes are handled as boolean values. Ids will be joined by dashes (-) and classes by spaces.
The following template

```haml
        %h1
          %div{id: "test"}
            %p{id: \'test2\', ' +
                class: "blah", name: null, test: false, checked: false, selected: true} This is some text
              This is some text
            This is some div text
            %div{id: [\'test\', 1], class: [model.name, "class2"]}
```

should generate

```html
        <h1>
          <div id="test">
            <p id="test2" class="blah" selected="selected">
              This is some text
              This is some text
            </p>
            This is some div text
            <div id="test-1" class="class1 class2">
            </div>
          </div>
        </h1>
```

## Element Attributes with ()

As with the ruby implementation, HTML style attributes are also supported. However, these are evaluated at compile time
and not runtime as the ruby HAML does. This allows the template writer decide which attributes are pre-compiled and
which are evaluated at run-time.

```haml
        %h1
          %div(id = "test")
            %p(id=test2 class="blah" selected="selected") This is some text
              This is some text
            This is some div text
            %div(id=test){id: 1, class: [model.name, "class2"]}
```

```html
        <h1>
          <div id="test">
            <p id="test2" class="blah" selected="selected">
             This is some text
              This is some text
            </p>
            This is some div text
            <div id="test-1" class="class1 class2">
            </div>
          </div>
        </h1>
```

## Unescaped Lines

Any line starting with an exclamation is skipped over by the parser and copied as is to the
output buffer. This allows lines which may cause parsing issues to be included in the output.

```haml
        %h1 !<div>
          !#test.test
            !%p#test.blah{id: 2, class: "test"} This is some text
              !This is some text
        !    This is some <div> text
        !    <div class="class1 class2"></div>
```

```html
        <h1>
          <div>
          #test.test
            %p#test.blah{id: 2, class: "test"} This is some text
              This is some text
            This is some <div> text
            <div class="class1 class2"></div>
        </h1>
```

## Jasmine Test
For more information on what is implemented, have a look at the jasmine test in the spec folder.
