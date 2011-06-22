/*global haml */

describe('haml', function () {

  beforeEach(function () {
    haml.cache = {};
  });

  describe('empty template', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="empty"></script>');
    });

    it('should return an empty string', function () {
      expect(haml.compileHaml('empty').call(null, {})).toEqual('');
    });
  });

  describe('simple template', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="simple">\n' +
        '%h1\n' +
        '  %div\n' +
        '    %p\n' +
        '    %span</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('simple').call(null, {});
      expect(html).toEqual(
        '<h1>\n' +
        '  <div>\n' +
        '    <p>\n' +
        '    </p>\n' +
        '    <span>\n' +
        '    </span>\n' +
        '  </div>\n' +
        '</h1>\n');
    });

  });

  describe('invalid template', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="invalid">%h1\n' +
        '  %h2\n' +
        '    %h3{%h3 %h4}\n' +
        '      %h4\n' +
        '        %h5</script>' +
        '<script type="text/template" id="invalid2">%h1\n' +
        '  %h2\n' +
        '    %h3{id: "test", class: "test-class"\n' +
        '      %h4\n' +
        '        %h5</script>');
      this.addMatchers({
        toThrowContaining: function (expected) {
          var result = false;
          var exception;
          if (typeof this.actual !== 'function') {
            throw new Error('Actual is not a function');
          }
          try {
            this.actual();
          } catch (e) {
            exception = e;
          }
          if (exception) {
            result = exception.toString().indexOf(expected) >= 0;
          }

          var not = this.isNot ? "not " : "";

          this.message = function () {
            if (exception) {
              return ["Expected function " + not + "to throw something with ", expected, ", but it threw", exception].join(' ');
            } else {
              return "Expected function to throw an exception.";
            }
          };

          return result;
        }
      });
    });

    it('should provide a meaningful message', function () {
      expect(function () {
        haml.compileHaml('invalid').call(null, {});
      }).toThrowContaining('at line 3 and character 16:\n' +
          '    %h3{%h3 %h4}\n' +
          '---------------^');
      expect(function () {
        haml.compileHaml('invalid2');
      }).toThrowContaining('at line 3 and character 8:\n' +
        '    %h3{id: "test", class: "test-class"\n' +
        '-------^');
    });

  });

  describe('simple template with text', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="simple">\n' +
        '%h1\n' +
        '  %div\n' +
        '    %p This is some text\n' +
        '      This is some text\n' +
        '    This is some <div> text\n' +
        '    \\%span\n' +
        '    %span %h1 %h1 %h1</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('simple').call(null, {});
      expect(html).toEqual(
        '<h1>\n' +
          '  <div>\n' +
          '    <p>\n' +
          '      This is some text\n' +
          '      This is some text\n' +
          '    </p>\n' +
          '    This is some &lt;div&gt; text\n' +
          '    %span\n' +
          '    <span>\n' +
          '      %h1 %h1 %h1\n' +
          '    </span>\n' +
          '  </div>\n' +
          '</h1>\n');
    });

  });

  describe('template with {} attributes', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="attributes">\n' +
        '%h1\n' +
        '  %div{id: "test"}\n' +
        '    %p{id: \'test2\', ' +
        '        class: "blah", name: null, test: false, checked: false, selected: true} This is some text\n' +
        '      This is some text\n' +
        '    This is some div text\n' +
        '    %div{id: [\'test\', 1], class: [model.name, "class2"]}\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('attributes').call(null, { model: { name: 'class1' } });
      expect(html).toEqual(
        '<h1>\n' +
        '  <div id="test">\n' +
        '    <p id="test2" class="blah" selected="selected">\n' +
        '      This is some text\n' +
        '      This is some text\n' +
        '    </p>\n' +
        '    This is some div text\n' +
        '    <div id="test-1" class="class1 class2">\n' +
        '    </div>\n' +
        '  </div>\n' +
        '</h1>\n');
    });

  });

  describe('template with () attributes', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="attributes">\n' +
        '%h1\n' +
        '  %div(id = "test")\n' +
        '    %p(id=test2 class="blah" selected="selected") This is some text\n' +
        '      This is some text\n' +
        '    This is some div text\n' +
        '    %div(id=test){id: 1, class: [model.name, "class2"]}\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('attributes').call(null, { model: { name: 'class1' } });
      expect(html).toEqual(
        '<h1>\n' +
        '  <div id="test">\n' +
        '    <p id="test2" class="blah" selected="selected">\n' +
        '      This is some text\n' +
        '      This is some text\n' +
        '    </p>\n' +
        '    This is some div text\n' +
        '    <div id="test-1" class="class1 class2">\n' +
        '    </div>\n' +
        '  </div>\n' +
        '</h1>\n');
    });

  });

  describe('template with id and class selectors', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="attributes">\n' +
        '%h1\n' +
        '  #test.test\n' +
        '    %p#test.blah{id: 2, class: "test"} This is some text\n' +
        '      This is some text\n' +
        '    This is some div text\n' +
        '    .class1.class2/\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('attributes').call(null, {});
      expect(html).toEqual(
        '<h1>\n' +
        '  <div id="test" class="test">\n' +
        '    <p id="test-2" class="blah test">\n' +
        '      This is some text\n' +
        '      This is some text\n' +
        '    </p>\n' +
        '    This is some div text\n' +
        '    <div class="class1 class2"/>\n' +
        '  </div>\n' +
        '</h1>\n');
    });

  });

  describe('template with unescaped HTML', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="unescaped">\n' +
        '%h1 !<div>\n' +
        '  !#test.test\n' +
        '    !%p#test.blah{id: 2, class: "test"} This is some text\n' +
        '      !This is some text\n' +
        '!    This is some <div> text\n' +
        '!    <div class="class1 class2"></div>\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('unescaped').call(null, {});
      expect(html).toEqual(
        '<h1>\n' +
        '  <div>\n' +
        '  #test.test\n' +
        '    %p#test.blah{id: 2, class: "test"} This is some text\n' +
        '      This is some text\n' +
        '    This is some <div> text\n' +
        '    <div class="class1 class2"></div>\n' +
        '</h1>\n');
    });

  });


  describe('template with Javascript evaluation', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="evaluation">\n' +
        '.box.error\n' +
        '  %span\n' +
        '    = errorTitle\n' +
        '  .clear\n' +
        '    %span= errorHeading\n' +
        '    = var label = "Calculation: "; return label + (1 + 2 * 3)\n' +
        '    = ["hi", "there", "reader!"]\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('evaluation').call(null, {
          errorTitle: "Error Title",
          errorHeading: "Error Heading <div>div text</div>"
        });
      expect(html).toEqual(
        '<div class="box error">\n' +
        '  <span>\n' +
        '    Error Title\n' +
        '  </span>\n' +
        '  <div class="clear">\n' +
        '    <span>\n' +
        '      Error Heading &lt;div&gt;div text&lt;/div&gt;\n' +
        '    </span>\n' +
        '    Calculation: 7\n' +
        '    hi,there,reader!\n' +
        '  </div>\n' +
        '</div>\n');
    });

  });

});
