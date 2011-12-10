# Release 2 - 2011-12-10 - Converted compiler to coffeescript and refactored the code generation out into a separate object

This release is mainly a refactoring of the compiler with the eventual goal to be able to support haml in other
languages that execute in a Javascript interpreter. One of the near term goals is to support coffeescript.

The following issues have been fixed since the 1.1 release:

* Fix to prevent 0 values being rendered as empty string (thanks to Yongmin Xia)
* Merged pull request from makevoid
* Modified underscore string escapeHTML to convert apostrophes to &#39; instead of &apos; to support rendering in IE7

The following HAML options have **NOT** been implemented:

* HAML Options
* #{} interpolation
* Attribute Methods
* Doctype: !!!
* Filters
* Multiline: |

All the other features should work as documented in the HAML reference.
