# Release 4.1 - 2012-01-14 - Refactored the main compile method, implemented loading a template from a URL

Cleaned up the main haml compile method to take a hash of options
Implemented a sourceUrl option that allows loading the template from a URL via ajax (requiring jquery 1.5.1+)