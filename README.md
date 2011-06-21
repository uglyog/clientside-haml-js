# Client-side HAML compiler in Javascript

The clientside-haml-js is a compiler written in Javascript that compiles text templates in HAML format into Javascript functions that generate HTML. It 
has been inspired by the server side haml Javascript project https://github.com/creationix/haml-js, and has been written to be feature compatible with Ruby server 
side HAML http://haml-lang.com/docs/yardoc/file.HAML_REFERENCE.html, supports all major browsers (IE 7+, Firefox 3.6+, Chrome 10+, Safari), have minimal dependancies
(only JQuery) and be fast.

# To use it

* Include the haml.js in your page:

    <script type="text/javascript" src="js/haml.js"></script>

* The HAML templates will have to be added to the body of the web page in a script tag, and have a unique ID.

`<script type="text/haml-template" id="simple">`<br/>
`%h1`<br/>
&nbsp;&nbsp;`%div`<br/>
&nbsp;&nbsp;&nbsp;&nbsp;`%p`<br/>
&nbsp;&nbsp;&nbsp;&nbsp;`%span`<br/>
`</script>`<br/>

* To compile the haml template into a Javascript function, call the haml.compileHaml function, providing it with the ID of the template.
`haml.compileHaml('simple')`

This will produce the following Javascript function:
`function anonymous(context) {`<br/>
&nbsp;&nbsp;`with(context) {`<br/>
&nbsp;&nbsp;&nbsp;&nbsp;`var html = "";`<br/>
&nbsp;&nbsp;&nbsp;&nbsp;`html += "<h1>\n  <div>\n    <p>\n    </p>\n    <span>\n    </span>\n  </div>\n</h1>\n";`<br/>
&nbsp;&nbsp;&nbsp;&nbsp;`return html;`<br/>
&nbsp;&nbsp;`}`<br/>
&nbsp;&nbsp;``<br/>
` }`<br/>


* The function can be called, and it takes one parameter: a context object.

`var fn = haml.compileHaml('simple');`<br/>
`var html = fn({});`<br/>

This will produce the following HTML:
`<h1>`<br/>
&nbsp;&nbsp;`<div>`<br/>
&nbsp;&nbsp;&nbsp;&nbsp;`<p>`<br/>
&nbsp;&nbsp;&nbsp;&nbsp;`</p>`<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`<span>`<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`</span>`<br/>
&nbsp;&nbsp;`</div>`<br/>
`</h1>`<br/>
