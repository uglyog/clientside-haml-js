# Release 4.3 - 2012-04-02 - Fix to get haml working with underscore string > 1.1.4

With versions of underscore string after 1.1.4, the underscore string functions are no longer automatically mixed into
the undercsore library. This fix will first look for _.str, then default back to using _.

The regexp for matching starting functions was loosened to allow spaces to be optional between the function keyword and
brackets/braces (thanks to caryfitzhugh for this fix).