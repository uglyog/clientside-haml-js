# Release 1 - 2011-07-25 - Bugfixes plus main missing Haml features

The following issues have been fixed:
* #1 HTML style attributes with dashes
* #2 Anonymous functions should pass through 'this'
* #3 Textarea white space
* #4 for attributes should be handled the same as ids
* #6 Empty lines should be ignored
* #7 Infinite loop when an attribute is missing it's closing qoute
* #8 Whitespace Removal: > and <
* #9 Object Reference: []
* #10 Whitespace Preservation: ~
* #11 HTML5 Custom Data Attributes

The following HAML options have **NOT** been implemented:

* HAML Options
* #{} interpolation
* Attribute Methods
* Doctype: !!!
* Filters
* Multiline: |

All the other features should work as documented in the HAML reference.
