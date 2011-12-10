# Client-side HAML compiler for Javascript

The clientside-haml-js is a compiler written in Coffeescript that compiles text templates in HAML format into Javascript
functions that generate HTML. It has been inspired by the server side [haml Javascript project](https://github.com/creationix/haml-js),
and has been written to be feature compatible with [Ruby server side HAML](http://haml-lang.com/docs/yardoc/file.HAML_REFERENCE.html),
supports all major browsers (IE 7+, Firefox 3.6+, Chrome 10+, Safari), have minimal runtime dependencies (only
[underscore.js](http://documentcloud.github.com/underscore/) and [underscore.string](https://github.com/edtsech/underscore.string)).

**NOTE:** The haml compiler requires a browser with a JSON parser. For browsers like IE7, you need to also include a JSON
 implementation. See [http://www.json.org/] for more details. A JSON implementation is available at [https://github.com/douglascrockford/JSON-js].

#Releases
* Release 0   -  2011-06-28 - [https://github.com/uglyog/clientside-haml-js/tarball/release_0] [Release Notes](clientside-haml-js/blob/master/Release-0.markdown)
* Release 1   -  2011-07-25 - [https://github.com/uglyog/clientside-haml-js/tarball/release_1] [Release Notes](clientside-haml-js/blob/master/Release-1.markdown)
* Release 1.1 -  2011-10-15 - [https://github.com/uglyog/clientside-haml-js/tarball/release_1_1] [Release Notes](clientside-haml-js/blob/master/Release-1.1.markdown)
* Release 2.0 -  2011-12-10 - [https://github.com/uglyog/clientside-haml-js/tarball/release_2_0] [Release Notes](clientside-haml-js/blob/master/Release-2.0.markdown)

Thanks to following people who have contributed: @translated, @pjmurray, @ramoney75, @jasonxia, @makevoid

# To use it

* Include the haml.js in your page:

```javascript
    <script type="text/javascript" src="js/haml.js"></script>
```

* The HAML templates can either be added to the body of the web page in a script tag (with a unique ID), as in:

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
    var html = fn();
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

* The HAML can also be passed in as a String, as in:

```javascript
    var fn = haml.compileStringToJs("%h1\n  %div\n    %p\n    %span');
    var html = fn();
```

This should produce the same HTML as the example above.

# Produced Javascript functions

The generated javascript functions take a single optional context variable which provide the context to the template.
All the properties of the context variable will be available as variables in the template. See the examples below for
more details on how to use this.

# Client-side HAML Flavour

Although I tried keep the implementation as close to the Ruby one as possible, there are some differences. Also,
currently not all features are implemented (see the release notes for details).

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
      var html = haml.compileHaml('evaluation').call({
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

You can leave the closing block out if the javascript line ends in either a brace ({), in which case a closing brace is
added, or if it ends in an anonymous function (like `function(...) {`), in which case a closing brace and bracket is added.

### Object references - []

You can use object references to supply the id and class attributes of a tag by placing the object variable within square
brackets. The Haml compiler will look for an id and class attribute on the object to use, and if not found, will look for
a `get` function to call which takes the name of the attribute as a parameter. This will allow you to use objects from
frameworks like [Backbone.js](http://documentcloud.github.com/backbone/) to set the id and class of a tag.

So, the following Haml and Javascript:

```haml
        %h1
          %div[test]
            %p[test2] This is some text
              This is some text
            This is some div text
            .class1[test3]{id: 1, class: "class3", for: "something"}
```

```javascript
      var context = {
        test: {
          id: 'test'
        },
        test2: {
          id: 'test2',
          'class': 'blah'
        },
        test3: {
          attributes: {
            id: 'test',
            'class': 'class2'
          },
          get: function (name) {
            return this.attributes[name];
          }
        }
      };
      var html = haml.compileHaml('object-reference')(context);
```

should result in the following HTML:

```html
        <h1>
          <div id="test">
            <p id="test2" class="blah">
              This is some text
              This is some text
            </p>
            This is some div text
            <div class="class1 class2 class3" id="test-1" for="something">
            </div>
          </div>
        </h1>
```

## Jasmine Test
For more information on what is implemented, have a look at the jasmine test in the spec folder.
