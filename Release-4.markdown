# Release 4 - 2012-01-08 - Implemented #{} interpolation and filters

Filters have finally been implemented. Filter functions can be added by adding a key to function mapping in `haml.filters`.
See filters.coffee for examples. The following filters are available:
* plain
* javascript
* css
* cdata
* preserve
* escape

Embedded code in #{} blocks can now be added to plain text as well as filter blocks.

The following HAML options have still **NOT** been implemented:

* HAML Options
* Attribute Methods
* #{} code blocks in HTML style attributes (just use the {} form)

All the other features should work as documented in the HAML reference.
