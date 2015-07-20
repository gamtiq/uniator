# uniator

Combine style-tags and CSS-files linked by HTML-file into one or several files or style-tags.

Uniator scans contents of HTML-file, searches for style-tags and link-tags pointing to CSS-files,
gathers contents of found tags together, removes source tags and creates one or several files or style-tags
containing collected contents.

There is [Grunt plugin](https://github.com/gamtiq/grunt-uniator).

[![NPM version](https://badge.fury.io/js/uniator.png)](http://badge.fury.io/js/uniator)
[![Build Status](https://secure.travis-ci.org/gamtiq/uniator.png?branch=master)](http://travis-ci.org/gamtiq/uniator)
[![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/)

## Installation

    npm install uniator

## Usage

```js
var uniator = require("uniator");
...
var result = uniator.collectCSS(htmlContent, settings);   // settings are optional
...
uniator.collectCssInFile(filePath, settings);   // settings are optional; also returns result (see below)
```

### Example

#### Source files

##### `index.html`
```html
<html>
<head>
    <title>Title</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">

    <link rel="stylesheet" href="style/a.css" type="text/css">
    <link rel="stylesheet" href="style/b.css">
    <style>
        h3 {
            color: #ff0;
        }
    </style>
    <link rel="stylesheet" type="text/css" href="style/subdir/c.css">
    <style>
        div {
            font-size: 14px;
        }
    </style>
    
</head>
<body>
    <link rel="stylesheet" type="text/css" href="style/extra/unknown.css">
    <h3>This is header</h3>
    <link rel="stylesheet" type="text/css" href="style/subdir/empty.css">
    <div>
        This is content.
    </div>
    <link href="style/d.css" rel="stylesheet">
</body>
</html>
```

##### `style/a.css`
```css
.a {
    position: relative;
}
```

##### `style/b.css`
```css
/* This is b.css */

.b {
    color: #0000ff;
}

.b__mod {
    font-size: 20px;
}
```

##### `style/subdir/c.css`
```css
.c {
    width: 50%;
}
```

##### `style/d.css`
```css
.delta {
    animation-name: delta;
}
```

#### JavaScript-code

```js
uniator.collectCssInFile("index.html", {cssFile: "css/combined", minifyCss: true});
```

#### Output files

##### `index.html`
```html
<html>
<head>
    <title>Title</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">

    <link rel="stylesheet" href="css/combined.css" type="text/css">
    
    
    
    
    
</head>
<body>
    <link rel="stylesheet" type="text/css" href="style/extra/unknown.css">
    <h3>This is header</h3>
    
    <div>
        This is content.
    </div>
    
</body>
</html>
```

##### `css/combined.css`
```css
.a{position:relative}.b{color:#00f}.b__mod{font-size:20px}h3{color:#ff0}.c{width:50%}div{font-size:14px}.delta{animation-name:delta}
```

See `test/uniator.js` for additional examples.

## API

### collectCSS(content: String, [settings: Object]): Object

Process the given content and gather all styles together into file(s) or style-tag(s).

**Parameters:**

* `content: String` - The content that should be processed.
* `settings: Object` - Optional operation settings. Keys are settings names, values are corresponding settings values.
    The following settings are supported:
    * `baseDir`: `String` - path to directory relative to which files should be searched and created; 
        can be used when `sourceDir` and `destDir` are equal; current working directory by default
    * `callback`: `Function` - function that should be called to process the result; 
        the following arguments will be passed into function:
        
        - `error`: `Array` | `null` - list of errors that were detected during processing
        - `result`: `Object` - the object that is returned as result of `collectCSS` function (see below)
    * `collectStyle`: `Boolean` - whether contents of style-tags should be collected; `true` by default
    * `cssFile`: `String` - base of name of file into which collected styles will be saved; should not contain an extension;
        for example, `all` or `path/to/style`; `style` by default
    * `destDir`: `String` - path to directory relative to which files should be created; 
        current working directory by default
    * `encoding`: `String` - files encoding; "utf8" by default
    * `include`: `Boolean` - whether collected styles should be included into content; `false` by default
    * `minifyCss`: `Boolean` | `Object` - whether collected styles should be minified; `false` by default;
        you can use an object as option value to specify options for minification;
        see [How to use clean-css programmatically?](https://github.com/GoalSmashers/clean-css#how-to-use-clean-css-programmatically)
        for list of available options
    * `removeEmptyRef`: `Boolean` - whether link-tags pointing to empty CSS-files should be removed; `true` by default
    * `removeEmptyStyle`: `Boolean` - whether empty style-tags should be removed; `true` by default
    * `removeSourceFile`: `Boolean` - whether collected source CSS-files should be removed; `false` by default
    * `skipCssFile`: `Array` | `String` - a CSS-file or list of CSS-files that should not be collected;
        each file can be specified by name or by path; if file has `.css` extension the extension can be omitted
    * `sourceDir`: `String` - path to directory relative to which files should be searched; 
        current working directory by default
    * `updateUrl`: `Boolean` | `Function` - whether URLs found in CSS-files should be updated to be accessible from destination file;
        `false` by default; a function can be used as the setting value; in the latter case the function will be called
        instead of predefined function to get new URL; if the function returns a string value, that value will be used as new URL;
        a non-string value returned by the function will be ignored (i.e. the source URL will not be changed);
        data object will be passed into the function (see [getUpdatedUrl](#getUpdatedUrl) to consult object' structure)
    * `warnNotFound`: `Boolean` - whether to include warning about CSS-file that is not found; `true` by default

**Returns** the result object that contains the following fields:

* `error`: `Array` | `null` - list of errors that were detected during processing
* `result`: `String` - the processed content
* `warning`: `Array` | `null` - list of warnings that were found during processing;
    each warning is an object that contains `message` field and maybe another fields representing warning details

### collectCssInFile(file: String, [settings: Object]): Object

Process the given file and gather all styles together into file(s) or style-tag(s).

**Parameters:**

* `file: String` - Path to file that should be processed.
* `settings: Object` - Optional operation settings. Keys are settings names, values are corresponding settings values.
    The following settings are supported:
    
    * `destFile`: `String` - path to destination file into which the processed content will be saved; the source file by default
    
    All other settings are equal to settings of `collectCSS` function.
    The only exception is that `baseDir`, `destDir` and `sourceDir` are directory of source or destination file by default.

**Returns** the result object. Contains the same fields as the result of `collectCSS` plus the following fields:

* `file`: `String` - absolute path to file that contains operation result.

### <a name="getUpdatedUrl"></a>getUpdatedUrl(data: Object): String

Determine new value of relative URL.

**Parameters:**

* `data: Object` - Represents data about URL and environment.
    Contains the following fields:
    
    * `destDir`: `String` - path to directory of destination CSS-file
    * `sourceDir`: `String` - path to directory of source CSS-file
    * `url`: `String` - source URL

**Returns** string that represents the new URL, or source URL when URL is not relative.

## Special Thanks

It would be much more difficult to implement uniator without usage of the following great libraries:

* [cheerio](https://github.com/MatthewMueller/cheerio) is used for HTML parsing and transformation.
* [fs-extra](https://github.com/jprichardson/node-fs-extra) is used for file system operations.
* [rework](https://github.com/reworkcss/rework) is used for CSS processing.
* [clean-css](https://github.com/GoalSmashers/clean-css) is used for CSS minifying.

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality.
Lint and test your code using [Grunt](http://gruntjs.com/).

## License
Copyright (c) 2014-2015 Denis Sikuler  
Licensed under the MIT license.
