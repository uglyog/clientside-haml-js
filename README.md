# Client-side HAML compiler in Javascript

The clientside-haml-js is a compiler written in Javascript that compiles text templates in HAML format into Javascript functions that generate HTML. It 
has been inspired by the server side haml Javascript project https://github.com/creationix/haml-js, and has been written to be feature compatible with Ruby server 
side HAML http://haml-lang.com/docs/yardoc/file.HAML_REFERENCE.html, supports all major browsers (IE 7+, Firefox 3.6+, Chrome 10+, Safari), have minimal dependancies
(only JQuery) and be fast.

# To use it

* Include the haml.js in your page.
```html
&lt;script type="text/javascript" src="js/haml.js"&gt;&lt;/script&gt
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