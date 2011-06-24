# Client-side HAML compiler in Javascript

The clientside-haml-js is a compiler written in Javascript that compiles text templates in HAML format into Javascript
functions that generate HTML. It has been inspired by the server side haml Javascript project
https://github.com/creationix/haml-js, and has been written to be feature compatible with Ruby server side HAML
http://haml-lang.com/docs/yardoc/file.HAML_REFERENCE.html, supports all major browsers (IE 7+, Firefox 3.6+,
Chrome 10+, Safari), have minimal dependencies (only [http://documentcloud.github.com/underscore/]
and [https://github.com/edtsech/underscore.string]).

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

## Embedded Javascript

There are 3 ways you can embed javascript in your template, with {} attributes (see above), = expressions and - lines

### Assigning an expression to a tag

Adding an equals (=) to the end of a tag or at the start of a line allows a javascript expression to be evaluated
and the result escaped and added to the contents of the tag. So for the following template

```haml
        .box.error
          %span
            = errorTitle
          .clear
            %span= errorHeading
            = var label = "Calculation: "; return label + (1 + 2 * 3)
            = ["hi", "there", "reader!"]
            = evilScript
```

and calling

```javascript
      var html = haml.compileHaml('evaluation').call(null, {
          errorTitle: "Error Title",
          errorHeading: "Error Heading <div>div text</div>",
          evilScript: '<script>alert("I\'m evil!");</script>'
        });
```

should render

```html
        <div class="box error">
          <span>
            Error Title
          </span>
          <div class="clear">
            <span>
              Error Heading &lt;div&gt;div text&lt;/div&gt;
            </span>
            Calculation: 7
            hi,there,reader!
            &lt;script&gt;alert(&quot;I&apos;m evil!&quot;);&lt;/script&gt;
          </div>
        </div>
```

### Adding javascript code to the template

Any line starting with a minus (-) will be copied to the generated javascript function. Make sure you get your
brackets and braces closed in the correct places!

```haml
        .main
          - var foo = "hello";
          - foo += " world";
          %span
            = foo
```

```html
        <div class="main">
          <span>
            hello world
          </span>
        </div>
```

With loops:

```haml
        .main
          - _(["Option 1", "Option 2", "Option 3"]).each(function (option) {
            %span= option
          - });
          - for (var i = 0; i < 5; i++) {
            %p= i
          - }
```

```html
        <div class="main">
            <span>
              Option 1
            </span>
            <span>
              Option 2
            </span>
            <span>
              Option 3
            </span>
            <p>
              0
            </p>
            <p>
              1
            </p>
            <p>
              2
            </p>
            <p>
              3
            </p>
            <p>
              4
            </p>
        </div>
```

## Jasmine Test
For more information on what is implemented, have a look at the jasmine test in the spec folder.
