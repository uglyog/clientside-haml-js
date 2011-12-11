# Client-side HAML compiler for Javascript and CoffeeScript

The clientside-haml-js is a compiler written in CoffeeScript that compiles text templates in HAML format into Javascript
functions that generate HTML. It has been inspired by the server side [haml Javascript project](https://github.com/creationix/haml-js),
and has been written to be feature compatible with [Ruby server side HAML](http://haml-lang.com/docs/yardoc/file.HAML_REFERENCE.html),
supports all major browsers (IE 7+, Firefox 3.6+, Chrome 10+, Safari), have minimal runtime dependencies (only
[underscore.js](http://documentcloud.github.com/underscore/), [underscore.string](https://github.com/edtsech/underscore.string)
and CoffeeScript if using CoffeeScript in your templates).

**NOTE:** The haml compiler requires a browser with a JSON parser. For browsers like IE7, you need to also include a JSON
 implementation. See [http://www.json.org/] for more details. A JSON implementation is available at [https://github.com/douglascrockford/JSON-js].

Thanks to following people who have contributed: [translated](https://github.com/translated),
[pjmurray](https://github.com/pjmurray), [ramoney75](https://github.com/ramoney75), [jasonxia](https://github.com/jasonxia),
[makevoid](https://github.com/makevoid)

#Releases
* Release 0   -  2011-06-28 - [https://github.com/uglyog/clientside-haml-js/tarball/release_0] [Release Notes](clientside-haml-js/blob/master/Release-0.markdown)
* Release 1   -  2011-07-25 - [https://github.com/uglyog/clientside-haml-js/tarball/release_1] [Release Notes](clientside-haml-js/blob/master/Release-1.markdown)
* Release 1.1 -  2011-10-15 - [https://github.com/uglyog/clientside-haml-js/tarball/release_1_1] [Release Notes](clientside-haml-js/blob/master/Release-1.1.markdown)
* Release 2   -  2011-12-10 - [https://github.com/uglyog/clientside-haml-js/tarball/release_2_0] [Release Notes](clientside-haml-js/blob/master/Release-2.markdown)
* Release 3   -  2011-12-11 - [https://github.com/uglyog/clientside-haml-js/tarball/release_3_0] [Release Notes](clientside-haml-js/blob/master/Release-3.markdown)

# To use it

* Include the haml.js in your page:

```javascript
    <script type="text/javascript" src="js/haml.js"></script>
```

* The HAML can either be passed in as a String, as in:

```javascript
    var fn = haml.compileStringToJs("%h1\n  %div\n    %p\n    %span');
    var html = fn();
```

* or added to the body of the web page in a script tag (with a unique ID), as in:

```html
    <script type="text/haml-template" id="simple">
    %h1
      %div
        %p
        %span
    </script>
```

* To compile the haml template into a Javascript function, call the `haml.compileStringToJs` or `haml.compileHaml`
functions, providing it with the haml contents or the ID of the haml template.

```javascript
    haml.compileHaml('simple')
```

This will produce the following Javascript function:

```javascript
    function anonymous(context) {
      var html = [];
      var hashFunction = null, hashObject = null, objRef = null, objRefFn = null;
      with (context || {}) {
        html.push("<h1>\n  <div>\n    <p>\n    </p>\n    <span>\n    </span>\n  </div>\n</h1>\n");
      }
      return html.join("");
    }
```

* The function can be called, and it takes one option parameter: a context object.

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

# HAML Templates with embedded CoffeeScript

clientside-haml-js also can compile templates with embedded CoffeeScript in it. There are equivalent functions to compile
these templates (use `compileCoffeeHaml` instead of `compileHaml` and `compileCoffeeHamlFromString` instead of
`compileStringToJs`). The main difference in using compiled functions from the Javascript ones is that you pass the
template context as the `this` pointer to the function via the call function instead of a parameter. You can then
access the context variables using `@name` notation.

For example, with the following template:

```html
    <script type="text/template" id="evaluation-using-context">
    .main
      - foo = @model.foo
      - foo += " world"
      %span
        = foo
    </script>
```

and calling

```coffescript
    model = foo: "hello"
    html = haml.compileCoffeeHaml('evaluation-using-context').call(model: model)
```

will generate the following function:

```coffeescript
    html = []
    html.push("<div class=\"main\">\n")
    foo = @model.foo
    foo += " world"
    html.push("  <span>\n    ")
    try
      exp = CoffeeScript.compile(" foo", bare: true)
      value = eval(exp)
      value ?= ""
      html.push(haml.HamlRuntime.escapeHTML(String(value)))
    catch e
      throw new Error(haml.HamlRuntime.templateError(6, 5, "    = foo",
        "Error evaluating expression - " + e))
    html.push("\n  </span>\n</div>\n")
    return html.join("")
```

and the resulting javascript function will render

```html
    <div class="main">
      <span>
        hello world
      </span>
    </div>
```

# Produced Javascript functions

For the Javascript compiler, the generated javascript functions take a single optional context variable which provide
the context to the template. All the properties of the context variable will be available as variables in the template.
See the examples below for more details on how to use this.

In the case of the CoffeeScript version, the functions use the context passed in as the `this` pointer via the call
function. The variables are then available using the `@name` notation.

# Client-side HAML Flavour

Although I tried keep the implementation as close to the Ruby one as possible, there are some differences. Also,
currently not all features are implemented (see the release notes for details).

## Element Attributes with {}

Elements with {} attributes are evaluated at runtime as Javascript code. This is similar to the ruby implementation,
but with Javascript or CoffeeScript code instead of Ruby. Values that result to null or false are excluded, and
'checked', 'selected' and 'disabled' attributes are handled as boolean values. Ids will be joined by dashes (-) and
classes by spaces.

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

## Embedded Javascript or CoffeeScript

There are 3 ways you can embed code in your template, with {} attributes (see above), = expressions and - lines

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
      var html = haml.compileHaml('evaluation')({
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

In the case of CoffeeScript, you would use the call function:

```coffeescript
      html = haml.compileCoffeeHaml('evaluation').call(errorTitle: "Error Title",
          errorHeading: "Error Heading <div>div text</div>",
          evilScript: '<script>alert("I\'m evil!");</script>')
```

### Adding code to the template

Any line starting with a minus (-) will be copied to the generated javascript function. For the Javascript version
of the compiler, you can leave the closing block out if the javascript line ends in either a brace ({), in which case
a closing brace is added, or if it ends in an anonymous function (like `(function(...) {`), in which case a closing
brace and bracket is added.

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

With loops, Javascript:

```haml
        .main
          - _(["Option 1", "Option 2", "Option 3"]).each(function (option) {
            %span= option
          - for (var i = 0; i < 5; i++) {
            %p= i
```

and CoffeeScript:

```haml
        .main
          - for option in ["Option 1", "Option 2", "Option 3"]
            %span= option
          - for i in [0..4]
            %p= i
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

### Multiline statements

Code lines can be extended over multiple lines by added a pipe (|) at the end of each line. Remember that the last
line must also end with a pipe.

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
For more information on what is implemented, have a look at the release notes and the jasmine test in the spec folder.
