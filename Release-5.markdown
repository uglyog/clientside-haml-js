# Release 5 - 2012-08-10 - Added faster javascript code generator

There is now a second javascript code generator (productionjavascript) which will produce slightly faster functions
at the cost of feedback while evaluating expressions. The main idea would be to use the standard generator while developing
and then switch to the production one when your code is released. The production version will run about 25% faster, depending
on browser (see http://jsperf.com/eval-cost-in-templates/3, safari 6 was 5 times faster)

The main downside to the new generator is that any errors that occur at runtime will not be linked back to the template source.
I.e., with a template with a javascript error, the original code generator will generate a function that throws the following
error:
    Error evaluating attribute hash - SyntaxError: Unexpected token % at line 3 and character 16:
        %h3{%h3 %h4}
    ---------------^

while the new functions will throw:
    Incorrect embedded code has resulted in an invalid Haml function - SyntaxError: Unexpected token %
    Generated Function:
      var html = [];
      var hashFunction = null, hashObject = null, objRef = null, objRefFn = null, value= null;
      with (context || {}) {
        html.push("<h1>\n  <h2>\n    <h3");
        hashFunction = function () { return {%h3 %h4}; };
        html.push(haml.HamlRuntime.generateElementAttributes(context, "", [""], objRefFn, {}, hashFunction, 3, 16, "    %h3{%h3 %h4}"));
        html.push(">\n      <h4>\n        <h5>\n        </h5>\n      </h4>\n    </h3>\n  </h2>\n</h1>\n");
      }
      return html.join("");