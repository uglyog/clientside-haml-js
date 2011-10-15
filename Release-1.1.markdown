# Release 1.1 - 2011-10-15 - Bugfix release

The following issues have been fixed:

* Updated the root from window to 'this' so that the compiler can be used on the server
* #15 - throw exception when template not found
* Fixed Issue #14 so that null evaluates to an empty string
* Fixed a bug in attribute parsing where newlines caused an infinite loop
