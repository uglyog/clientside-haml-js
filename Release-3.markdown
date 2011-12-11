# Release 3 - 2011-12-11 - Implemented the CoffeeScript code generator.

CoffeeScript can now be used for embedded code in the templates.

The following issues have been fixed since the 2 release:

* Issue #12 - Implemented doctypes as defined in the HAML reference (for per the default in Rails)
* Issue #13 - commented out lines should also comment out child lines that follow
* implemented code generator for CoffeeScript
* implemented multiline embedded code statements
* Used Cake to build the Javascript package and produce a minified version

The following HAML options have still **NOT** been implemented:

* HAML Options
* #{} interpolation
* Attribute Methods
* Filters

All the other features should work as documented in the HAML reference.
