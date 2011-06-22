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

Although I tried keep the implementation as close to the Ruby one as possible, there are some differences.

## Element Attributes with {}

Elements with {} attributes are evaluated at runtime as Javascript code. This is similar to the ruby implementation,
but with Javascript code instead of Ruby.

## Element Attributes with ()

As with the ruby implementation, HTML style attributes are also supported. However, these are evaluated at compile time
and not runtime as the ruby HAML does.