/*
 * uniator
 * https://github.com/gamtiq/uniator
 *
 * Copyright (c) 2014-2015 Denis Sikuler
 * Licensed under the MIT license.
 */


/**
 * @module uniator
 */


"use strict";

var fse = require("fs-extra"),
    path = require("path"),
    cheerio = require("cheerio"),
    CleanCss = require("clean-css"),
    mixing = require("mixing"),
    rework = require("rework");


function warningToString() {
    /*jshint validthis:true*/
    return this.message || "";
}


function normalizePath(p) {
    return p.split(path.sep).join("/");
}

/**
 * Check whether given file is in specified list.
 *
 * It is supposed that file is in list when:
 * 
 * * the file is an item of the list
 * * or the file has `.css` extension and the file without extension is an item of the list
 * * or [basename](http://nodejs.org/api/path.html#path_path_basename_p_ext) of the file is an item of the list
 * * or the file has `.css` extension and its `basename` without extension is an item of the list
 *
 * @param {String} file
 *     Name of file or path to file that should be checked.
 * @param {Array} fileList
 *     List of file names or paths that should be examined.
 * @return {Boolean}
 *   `true` if given file is in specified list,
 *   otherwise `false`.
 */
function isFileInList(file, fileList) {
    /*jshint laxbreak:true*/
    var sExt = path.extname(file);
    return fileList.length > 0
            && (fileList.indexOf(file) > -1
                || (sExt === ".css" && fileList.indexOf(file.substring(0, file.length - 4)) > -1)
                || fileList.indexOf(path.basename(file)) > -1
                || (sExt === ".css" && fileList.indexOf(path.basename(file, ".css")) > -1));
}


/**
 * Determine new value of relative URL.
 *
 * @param {Object} data
 *     Represents data about URL and environment.
 *     Contains the following fields:
 *     
 *   * `destDir`: `String` - path to directory of destination CSS-file
 *   * `sourceDir`: `String` - path to directory of source CSS-file
 *   * `url`: `String` - source URL
 * @return {String}
 *   String that represents the new URL, or source URL when URL is not relative.
 * @alias module:uniator.getUpdatedUrl
 */
function getUpdatedUrl(data) {
    var sUrl = data.url;
    if (sUrl.charAt(0) !== "/" && ! /^[^:\/\?#]+:/.test(sUrl)) {
        return normalizePath( path.relative(data.destDir, path.resolve(data.sourceDir, sUrl)) );
    }
    return sUrl;
}


/**
 * Process the given content and gather all styles together into file(s) or style-tag(s).
 *
 * @param {String} content
 *     The content that should be processed.
 * @param {Object} [settings]
 *     Operation settings. Keys are settings names, values are corresponding settings values.
 *     The following settings are supported:
 *     
 *   * `baseDir`: `String` - path to directory relative to which files should be searched and created; 
 *        can be used when `sourceDir` and `destDir` are equal; current working directory by default
 *   * `callback`: `Function` - function that should be called to process the result; 
 *        the following arguments will be passed into function:
 *           
 *        - `error`: `Array` | `null` - list of errors that were detected during processing
 *        - `result`: `Object` - the object that is returned as result of `collectCSS` function (see below)
 *   * `collectStyle`: `Boolean` - whether contents of style-tags should be collected; `true` by default
 *   * `cssFile`: `String` - base of name of file into which collected styles will be saved; should not contain an extension;
 *        for example, `all` or `path/to/style`; `style` by default
 *   * `destDir`: `String` - path to directory relative to which files should be created; 
 *        current working directory by default
 *   * `encoding`: `String` - files encoding; "utf8" by default
 *   * `include`: `Boolean` - whether collected styles should be included into content; `false` by default
 *   * `minifyCss`: `Boolean` | `Object` - whether collected styles should be minified; `false` by default;
 *        you can use an object as option value to specify options for minification;
 *        see [How to use clean-css programmatically?](https://github.com/GoalSmashers/clean-css#how-to-use-clean-css-programmatically)
 *        for list of available options
 *   * `removeEmptyRef`: `Boolean` - whether link-tags pointing to empty CSS-files should be removed; `true` by default
 *   * `removeEmptyStyle`: `Boolean` - whether empty style-tags should be removed; `true` by default
 *   * `removeSourceFile`: `Boolean` - whether collected source CSS-files should be removed; `false` by default
 *   * `skipCssFile`: `Array` | `String` - a CSS-file or list of CSS-files that should not be collected;
 *        each file can be specified by name or by path; if file has `.css` extension the extension can be omitted
 *   * `sourceDir`: `String` - path to directory relative to which files should be searched; 
 *        current working directory by default
 *   * `updateUrl`: `Boolean` | `Function` - whether URLs found in CSS-files should be updated to be accessible from destination file;
 *        `false` by default; a function can be used as the setting value; in the latter case the function will be called
 *        instead of predefined function to get new URL; if the function returns a string value, that value will be used as new URL;
 *        a non-string value returned by the function will be ignored (i.e. the source URL will not be changed);
 *        data object will be passed into the function (see {@link module:uniator.getUpdatedUrl getUpdatedUrl} to consult object' structure)
 *   * `warnNotFound`: `Boolean` - whether to include warning about CSS-file that is not found; `true` by default
 * @return {Object}
 *     The result object that contains the following fields:
 *     
 *   * `error`: `Array` | `null` - list of errors that were detected during processing
 *   * `result`: `String` - the processed content
 *   * `warning`: `Array` | `null` - list of warnings that were found during processing;
 *       each warning is an object that contains `message` field and maybe another fields representing warning details
 * @see {@link module:uniator.getUpdatedUrl getUpdatedUrl}
 * @alias module:uniator.collectCSS
 */
function collectCSS(content, settings) {
    /*jshint expr:true, laxbreak:true, quotmark:false*/
    
    function addWarning(data) {
        if (typeof data === "string") {
            data = {message: data};
        }
        data.toString = warningToString;
        (result.warning || (result.warning = [])).push(data);
    }
    
    if (! settings) {
        settings = {};
    }
    var bCollectStyle = "collectStyle" in settings ? settings.collectStyle : true,
        bInclude = settings.include,
        bRemoveEmptyRef = "removeEmptyRef" in settings ? settings.removeEmptyRef : true,
        bRemoveEmptyStyle = "removeEmptyStyle" in settings ? settings.removeEmptyStyle : true,
        bRemoveSourceFile = settings.removeSourceFile,
        bWarnNotFound = "warnNotFound" in settings ? settings.warnNotFound : true,
        sCssFile = settings.cssFile || "style",
        sEncoding = settings.encoding || "utf8",
        sDestDir = settings.destDir || settings.baseDir || "./",
        sSourceDir = settings.sourceDir || settings.baseDir,
        cssMinifier = settings.minifyCss,
        skipFileList = settings.skipCssFile,
        updateUrl = settings.updateUrl,
        
        // Parse content and search for styles
        doc = cheerio.load(content, {lowerCaseTags: true, lowerCaseAttributeNames: true}),
        tagList = doc("link, style"),
        nTagQty = tagList.length,
        tagGroupList = [],
        bNewTagGroup = true,
        
        bContentModified = false,
        checkStyleRegExp = /\w/,
        result = {
            error: null,
            result: content,
            warning: null
        },
        elem, nI, nK, nL, nQ, sFile, sPath, sStyles, tag, tagGroup;
    
    if (nTagQty) {
    
        if (! sSourceDir || ! fse.existsSync(sSourceDir)) {
            sSourceDir = path.resolve();
        }
        if (cssMinifier) {
            cssMinifier = new CleanCss(typeof cssMinifier === "object" ? cssMinifier : {});
        }
        if (skipFileList && typeof skipFileList === "string") {
            skipFileList = [skipFileList];
        }
        if (updateUrl && typeof updateUrl !== "function") {
            updateUrl = getUpdatedUrl;
        }
        
        // Iterate over found tags and form groups of tags that should be processed
        nK = 0;
        tagList.each(function(nI, tag) {
            var sName = tag.name,
                bLink = sName === "link",
                bStyle = sName === "style",
                tagAttr = tag.attribs,
                elem = doc(tag), 
                bNonEmpty, bSkip, sContent, sFile, tagGroup;
            if (! tagAttr.type || tagAttr.type === "text/css") {
            
                if ((bLink && tagAttr.rel === "stylesheet" && tagAttr.href
                            && (sFile = path.resolve(sSourceDir, tagAttr.href)) 
                            && ! ( bSkip = (skipFileList && isFileInList(tagAttr.href, skipFileList)) )) 
                        || bStyle) {
                    
                    // Link that points to non-existent file
                    if (bLink && ! fse.existsSync(sFile)) {
                        bWarnNotFound &&
                            addWarning({
                                message: ["'", tagAttr.href, "' is not found"].join(""),
                                ref: tagAttr.href,
                                file: sFile,
                                tag: doc.html(elem)
                            });
                    }
                    else {
                        sContent = bLink
                                    ? fse.readFileSync(sFile, {encoding: sEncoding})
                                    : elem.contents().toString();
                        bNonEmpty = sContent && checkStyleRegExp.test(sContent);
                        if (bLink || bCollectStyle) {
                            if (! bNonEmpty && ((bLink && bRemoveEmptyRef) || (bStyle && bRemoveEmptyStyle))) {
                                elem.remove();
                                bContentModified = true;
                                if (bLink && bRemoveSourceFile) {
                                    fse.unlinkSync(sFile);
                                }
                            }
                            // Non-empty or non-removed css-file/style-tag
                            else {
                                if (updateUrl) {
                                    sContent = rework(sContent)
                                                    .use(rework.url(function(sUrl) {
                                                        var sNewUrl = updateUrl({
                                                                                    url: sUrl,
                                                                                    sourceDir: path.dirname(sFile),
                                                                                    destDir: bInclude
                                                                                                ? sDestDir
                                                                                                : path.dirname( path.join(sDestDir, sCssFile + ".css") )
                                                                                });
                                                        return typeof sNewUrl === "string"
                                                                    ? sNewUrl
                                                                    : sUrl;
                                                    }))
                                                    .toString();
                                }
                                if (bNewTagGroup) {
                                    tagGroupList.push(tagGroup = []);
                                    bNewTagGroup = false;
                                }
                                else {
                                    tagGroup = tagGroupList[tagGroupList.length - 1];
                                }
                                tagGroup.push({
                                    name: sName,
                                    elem: elem,
                                    content: sContent,
                                    nonEmpty: bNonEmpty,
                                    file: bLink ? sFile : null,
                                    ref: bLink ? tagAttr.href : ++nK
                                });
                            }
                        }
                        // Style-tag that should not be collected
                        else if (bStyle) {
                            if (bNonEmpty) {
                                bNewTagGroup = true;
                            }
                            else if (bRemoveEmptyStyle) {
                                elem.remove();
                                bContentModified = true;
                            }
                        }
                    }
                }
                // Link that points to a file that should not be collected
                else if (sFile && bSkip) {
                    bNewTagGroup = true;
                }
            
            }
        });
        
        // Process found groups of tags
        for (nI = 0, nL = tagGroupList.length; nI < nL; nI++) {
            tagGroup = tagGroupList[nI];
            sStyles = "";
            // Collect styles of the group
            for (nK = 0, nQ = tagGroup.length; nK < nQ; nK++) {
                tag = tagGroup[nK];
                elem = tag.elem;
                sFile = tag.file;
                if (tag.nonEmpty) {
                    sStyles += (sFile
                                    ? ["/*----- ", tag.ref, " -----*/\n\n", tag.content, "\n\n"]
                                    : ["/*----- Style tag #", tag.ref, " -----*/\n\n", tag.content, "\n\n"]
                                ).join("");
                }
                if (bRemoveSourceFile && sFile) {
                    fse.unlinkSync(sFile);
                }
                if (nK) {
                    elem.remove();
                }
            }
            
            tag = tagGroup[0];
            elem = tag.elem;
            // Save collected styles
            if (checkStyleRegExp.test(sStyles)) {
                if (cssMinifier) {
                    sStyles = cssMinifier.minify(sStyles);
                }
                if (bInclude) {
                    elem.replaceWith("<style>\n" + sStyles + "</style>");
                }
                else {
                    sFile = path.join(sDestDir, sCssFile + (nL > 1 ? nI + 1 : "") + ".css");
                    sPath = normalizePath( path.relative(sDestDir, sFile) );
                    if (tag.file) {
                        elem.attr("href", sPath);
                    }
                    else {
                        elem.replaceWith('<link rel="stylesheet" type="text/css" href="' + sPath + '">');
                    }
                    fse.outputFileSync(sFile, sStyles);
                }
            }
            // Group contains empty files and/or styles
            else if (((tag.file && bRemoveEmptyRef) || (! tag.file && bRemoveEmptyStyle))) {
                elem.remove();
            }
        }
        
        if (nL || bContentModified) {
            result.result = doc.html();
        }
    
    }
    
    settings.callback &&
        settings.callback(result.error, result);
    return result;
}


/**
 * Process the given file and gather all styles together into file(s) or style-tag(s).
 *
 * @param {String} file
 *     Path to file that should be processed.
 * @param {Object} [settings]
 *     Operation settings. Keys are settings names, values are corresponding settings values.
 *     The following settings are supported:
 *     
 *   * `destFile`: `String` - path to destination file into which the processed content will be saved;
 *       the source file by default
 *   
 *   
 *   All other settings are equal to settings of {@link #collectCSS collectCSS} method.
 *   The only exception is that `baseDir`, `destDir` and `sourceDir` are directory of source or destination file by default.
 * @return {Object}
 *   The result object. Contains the same fields as the result of {@link collectCSS} plus the following fields:
 *   
 *   * `file`: `String` - absolute path to file that contains operation result.
 * @alias module:uniator.collectCssInFile
 */
function collectCssInFile(file, settings) {
    /*jshint expr:true*/
    
    // Prepare parameters
    file = path.resolve(file);
    if (! settings) {
        settings = {};
    }
    if (! settings.encoding) {
        settings.encoding = "utf8";
    }
    if (! settings.baseDir) {
        settings.baseDir = path.dirname(file);
    }
    
    var sDestFile = path.resolve(settings.destFile || file),
        content = fse.readFileSync(file, {encoding: settings.encoding}),
        result;
    if (! settings.destDir) {
        settings.destDir = path.dirname(sDestFile);
    }
    // Process file contents and save result
    if (content) {
        result = collectCSS( content, mixing({}, settings, {except: {callback: null, destFile: null}}) );
        result.file = sDestFile;
        if (! result.error && result.result !== content) {
            fse.outputFileSync(sDestFile, result.result);
        }
    }
    else {
        result = {
            error: null,
            result: content,
            warning: null,
            file: sDestFile
        };
    }
    settings.callback &&
        settings.callback(result.error, result);
    return result;
}

//Exports

exports.collectCSS = collectCSS;
exports.collectCssInFile = collectCssInFile;
exports.getUpdatedUrl = getUpdatedUrl;
