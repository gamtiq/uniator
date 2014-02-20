"use strict";
/*global after, before, beforeEach, describe, it*/

// Tests for uniator
describe("uniator", function() {
    /*jshint quotmark:false*/
    
    var path = require("path"),
        expect = require("chai").expect,
        CleanCss = require("clean-css"),
        fse = require("fs-extra"),
        
        uniator = require("../src/uniator"),
        
        cssMinifier = new CleanCss(),
        sTestDir = "./testdir",
        sEmptyCssFile = 'style/subdir/empty.css',
        sEmptyCssLink = '<link rel="stylesheet" type="text/css" href="' + sEmptyCssFile + '">',
        sNonExistentFile = 'non-existent-file',
        sNonExistentLink = '<link type="text/css" rel="stylesheet" href="' + sNonExistentFile + '">',
        sCurrentDir;

    function normalizeLineEnd(text) {
        return text.replace(/\r\n/g, "\n");
    }
    
    function getFileContent(filePath) {
        return normalizeLineEnd( fse.readFileSync(filePath, {encoding: 'utf8'}).toString() );
    }
    
    function resetTestDir() {
        process.chdir(__dirname);
        fse.removeSync(sTestDir);
        fse.copySync("./fixtures", sTestDir);
        process.chdir(sTestDir);
    }
    
    
    before(function() {
        sCurrentDir = process.cwd();
        resetTestDir();
    });
    
    after(function() {
        process.chdir(__dirname);
        fse.removeSync(sTestDir);
        process.chdir(sCurrentDir);
    });
    
    
    describe(".collectCSS", function() {
        var collectCSS = uniator.collectCSS;
            
        function check(text, settings, result) {
            if (typeof settings === "string" || Array.isArray(settings)) {
                result = settings;
                settings = null;
            }
            if (Array.isArray(text)) {
                text = text.join("");
            }
            if (Array.isArray(result)) {
                result = result.join("");
            }
            var actualResult = collectCSS(text, settings);
            expect( normalizeLineEnd(actualResult.result) )
                .equal(result || text);
            return actualResult;
        }
        
        it("should return source content", function() {
            
            check('Plain text');
            check([
                    '<html>\n',
                        '<head>',
                            '<title>\nNo links and styles</title>',
                        '</head>\n',
                        '<body>Some text</body>\n',
                    '</html>'
                    ]);
            
            check([
                    '<html>\n',
                        '<head>',
                            '<link type="text/css" rel="stylesheet">',
                            '<title>\nNo links and styles</title>',
                            '<link type="text/css">',
                        '</head>\n',
                        '<body>',
                            'Some text',
                            '<style></style>',
                            'some another\n',
                            'text\n',
                            '<link type="text/css" rel="stylesheet" href="non-existent-file">',
                        '</body>\n',
                        '<style type="text/css">\n   \n   \n</style>\n',
                        '<link href="style/subdir/empty.css" rel="stylesheet" type="text/css">',
                    '</html>'
                    ], 
                    {collectStyle: false, removeEmptyStyle: false, removeEmptyRef: false});
            
        });
        
        it("should remove link-tags pointing to empty CSS-files and empty style-tags", function() {
            check([
                    '<html>\n',
                        '<head>',
                            '<link type="text/css" href="style/subdir/empty.css" rel="stylesheet">',
                            '<title>\nEmpty links and styles</title>',
                            sEmptyCssLink,
                            '<link href="style/subdir/empty.css" rel="stylesheet">',
                            '<style type="text/css">\n   \n   \n</style>\n',
                            sNonExistentLink,
                        '</head>\n',
                        '<body>',
                            '<h3>Some header</h3>',
                            '<style>\n\t\n</style>',
                            '<link href="style/subdir/empty.css" \n rel="stylesheet" type="text/css">',
                            '<div>Some content\n</div>\n',
                            '<style type="text/css">                     </style>\n',
                        '</body>\n',
                    '</html>'
                    ],
                    [
                    '<html>\n',
                        '<head>',
                            '<title>\nEmpty links and styles</title>\n',
                            sNonExistentLink,
                        '</head>\n',
                        '<body>',
                            '<h3>Some header</h3>',
                            '<div>Some content\n</div>\n\n',
                        '</body>\n',
                    '</html>'
                    ]);
        });
        
        it("should ignore links without rel attribute or with incorrect rel and type attribute", function() {
            check([
                    '<html>\n',
                        '<head>',
                            '<link type="text/css" rel="stylesheet">',
                            '<title>\nIncorrect links</title>',
                            '<link href="style/subdir/empty.css" rel="stylesheet" type="text/new-css">\n',
                            '<link href="style/subdir/empty.css" rel="styles" type="text/css">\n',
                        '</head>\n',
                        '<body>',
                            '<link href="style/b.css" type="text/css">\n',
                            '<link incorrect>',
                            '<link rel="stylesheet" type="text/css">',
                            '<h3>Some header</h3>',
                            '<link relat="stylesheet" href="style/subdir/empty.css" type="text/css">',
                            '<div>Some content\n</div>\n',
                            '<link />',
                        '</body>\n',
                        '<link rel="stylesheetypo" href="style/subdir/empty.css">',
                    '</html>'
                    ]);
        });
        
        it("should ignore style-tags with incorrect type attribute", function() {
            check([
                    '<html>\n',
                        '<style type="bin/css">0xff \n {}</style>',
                        '<head>',
                            '<title>\nIncorrect style-tags</title>',
                            '<style type="text/cs">.a {margin: 0;}</style>',
                            '<style type="typo/css">* {padding: 10px;}</style>',
                        '</head>\n',
                        '<body>',
                            '<h3>Some header</h3>',
                            '<div>Some content\n</div>\n',
                            '<style type="text/extcss">.stranger {absolute-position; pos(100px, 200px);}</style>',
                        '</body>\n',
                    '</html>'
                    ]);
        });
        
        it("should warn about CSS-files that are not found", function() {
            var sTime = new Date().getTime().toString(),
                result = check([
                    '<html>\n',
                        '<head>\n',
                            '<link href="style/another-style-dir/empty.css" rel="stylesheet">',
                            '<title>\nLinks to non-existent files</title>\n',
                            sNonExistentLink,
                        '</head>\n',
                        '<body>',
                            '<h3>Some header</h3>',
                            '<link href="style/f', sTime , '.css" \n rel="stylesheet" type="text/css">',
                            '<div>Some \n content</div>\n',
                        '</body>\n',
                    '</html>'
                    ]),
                warningList = result.warning,
                nL = warningList.length,
                nI, warning;
            
            expect( warningList )
                .not.equal(null);
            expect( warningList )
                .instanceOf(Array);
            expect( warningList )
                .length(3);
            
            for (nI = 0; nI < nL; nI++) {
                warning = warningList[nI];
                
                expect( warning )
                    .contain.keys('message', 'ref', 'file', 'tag');
                expect( warning.message )
                    .have.string(' is not found');
                expect( warning.tag )
                    .have.string('link')
                    .and
                    .have.string('href')
                    .and
                    .have.string('rel')
                    .and
                    .have.string('stylesheet');
            }
            
            expect( warningList[0].ref )
                .equal('style/another-style-dir/empty.css');
            expect( warningList[1].ref )
                .equal(sNonExistentFile);
            expect( warningList[2].ref )
                .equal('style/f' + sTime + '.css');
        });
        
        it("should include all collected styles", function() {
            check([
                    '<style>\n',
                        '.toolbar__active {\n',
                            'top: 0;\n',
                        '}\n',
                    '</style>\n',
                    '<style>           \n \n            \t </style>',
                    '<style>\n',
                        '.toolbar__transparent:hover {\n',
                            'opacity: 1;',
                        '}\n',
                    '</style>\n',
                    '<style></style>\n',
                    '<style>                   </style>'
                    ],
                    {include: true},
                    [
                    '<style>\n',
                        '/*----- Style tag #1 -----*/\n\n',
                        '\n',
                        '.toolbar__active {\n',
                            'top: 0;\n',
                        '}\n',
                        '\n\n',
                        '/*----- Style tag #2 -----*/\n\n',
                        '\n',
                        '.toolbar__transparent:hover {\n',
                            'opacity: 1;',
                        '}\n',
                        '\n\n',
                    '</style>',
                    '\n\n\n'
                    ]);
            
            check([
                    '<link href="style/subdir/c.css" rel="stylesheet">\n',
                    sNonExistentLink,
                    '<link rel="stylesheet" \n href="style/a.css">',
                    sEmptyCssLink,
                    '<link rel="stylesheet" href="style/d.css">',
                    '<link \n \n \n href="style/b.css" rel="stylesheet">',
                    '<link rel="stylesheet" href="css-css-css/another.css">',
                    sEmptyCssLink
                    ],
                    {include: true},
                    [
                    '<style>\n',
                        '/*----- style/subdir/c.css -----*/\n\n',
                        getFileContent("style/subdir/c.css"),
                        '\n\n',
                        '/*----- style/a.css -----*/\n\n',
                        getFileContent("style/a.css"),
                        '\n\n',
                        '/*----- style/d.css -----*/\n\n',
                        getFileContent("style/d.css"),
                        '\n\n',
                        '/*----- style/b.css -----*/\n\n',
                        getFileContent("style/b.css"),
                        '\n\n',
                    '</style>',
                    '\n',
                    sNonExistentLink,
                    '<link rel="stylesheet" href="css-css-css/another.css">'
                    ]);
            
            check([
                    '<html>\n',
                        '<head>',
                            '<title>\nInclude collected styles</title>\n',
                            '<style>.start    {   left:   10px;   }\n</style>',
                            '<link rel="stylesheet" href="style/a.css">',
                            sEmptyCssLink,
                            '<style>\n    .interm {left: 50px;}\n</style>',
                            sNonExistentLink,
                        '</head>\n',
                        '<body>\n',
                            '<h3>Some header</h3>',
                            '<style> \n \n \t </style>',
                            sNonExistentLink,
                            sEmptyCssLink,
                            '<link type="text/css" rel="stylesheet" href="style/subdir/c.css">',
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ],
                    {include: true},
                    [
                    '<html>\n',
                        '<head>',
                            '<title>\nInclude collected styles</title>\n',
                            '<style>\n',
                                '/*----- Style tag #1 -----*/\n\n',
                                '.start    {   left:   10px;   }\n',
                                '\n\n',
                                '/*----- style/a.css -----*/\n\n',
                                getFileContent("style/a.css"),
                                '\n\n',
                                '/*----- Style tag #2 -----*/\n\n',
                                '\n    .interm {left: 50px;}\n\n\n',
                                '/*----- style/subdir/c.css -----*/\n\n',
                                getFileContent("style/subdir/c.css"),
                                '\n\n',
                            '</style>',
                            sNonExistentLink,
                        '</head>\n',
                        '<body>\n',
                            '<h3>Some header</h3>',
                            sNonExistentLink,
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ]);
        });
        
        it("should include and minify all collected styles", function() {
            var sStyle1 = '\n    .first-item{\n        color: #00c;\n}\n',
                sStyle2 = 'p,   div,  ul {\n    font-size: 16px;    \n}\n';
            check([
                    '<html>\n',
                        '<head>',
                            sEmptyCssLink,
                            sNonExistentLink,
                            '<title>\nInclude and minify collected styles</title>\n',
                            '<link rel="stylesheet" href="style/a.css">',
                            '<style>',
                            sStyle1,
                            '</style>',
                            sNonExistentLink,
                        '</head>\n',
                        '<link type="text/css" rel="stylesheet" href="style/d.css">',
                        '<body>\n',
                            '<style> \n \n             \t  \t\t\t    \n </style>',
                            '<h3>Some header</h3>\n',
                            '<link type="text/css" rel="stylesheet" href="style/b.css">',
                            '<style> \n \n \t </style>',
                            sNonExistentLink,
                            '<style>',
                            sStyle2,
                            '</style>',
                            sEmptyCssLink,
                            '<link type="text/css" rel="stylesheet" href="style/subdir/c.css">',
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ],
                    {include: true, minifyCss: true},
                    [
                    '<html>\n',
                        '<head>',
                            sNonExistentLink,
                            '<title>\nInclude and minify collected styles</title>\n',
                            '<style>\n',
                                getFileContent("style/a.min.css"),
                                cssMinifier.minify(sStyle1),
                                getFileContent("style/d.min.css"),
                                getFileContent("style/b.min.css"),
                                cssMinifier.minify(sStyle2),
                                getFileContent("style/subdir/c.min.css"),
                            '</style>',
                            sNonExistentLink,
                        '</head>\n',
                        '<body>\n',
                            '<h3>Some header</h3>\n',
                            sNonExistentLink,
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ]);
        });
        
        it("should collect styles into one file and remove source CSS-files", function() {
            var cssA = getFileContent("style/a.css"),
                cssB = getFileContent("style/b.css"),
                cssC = getFileContent("style/subdir/c.css"),
                cssD = getFileContent("style/d.css");
            check([
                    '<html>\n',
                        '<head>',
                            '<title>\nCollect styles into one file</title>\n',
                            '<style type="text/css">\n',
                            '.prefix {font-size: small;}\n',
                            '</style>',
                            '<link rel="stylesheet" href="style/b.css">',
                            '<link type="text/css" rel="stylesheet" href="style/a.css">',
                            sEmptyCssLink,
                        '</head>\n',
                        '<body>\n',
                            '<link type="text/css" rel="stylesheet" href="style/subdir/c.css">',
                            '<h3>Some header</h3>\n',
                            '<style type="strange-type">.middle {border: 1px;}</style>',
                            '<link rel="stylesheet" type="text/css" href="style/d.css">',
                            '<div>Some content\n</div>\n',
                            '<style>',
                            '.suffix {color: green;}',
                            '</style>',
                        '</body>\n',
                    '</html>'
                    ],
                    {removeSourceFile: true},
                    [
                    '<html>\n',
                        '<head>',
                            '<title>\nCollect styles into one file</title>\n',
                            '<link rel="stylesheet" type="text/css" href="style.css">',
                        '</head>\n',
                        '<body>\n',
                            '<h3>Some header</h3>\n',
                            '<style type="strange-type">.middle {border: 1px;}</style>',
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ]);
                    
            expect( fse.existsSync("style.css") )
                .equal(true);
            expect( getFileContent("style.css") )
                .equal([
                        '/*----- Style tag #1 -----*/\n\n',
                        '\n',
                        '.prefix {font-size: small;}\n',
                        '\n\n',
                        '/*----- style/b.css -----*/\n\n',
                        cssB,
                        '\n\n',
                        '/*----- style/a.css -----*/\n\n',
                        cssA,
                        '\n\n',
                        '/*----- style/subdir/c.css -----*/\n\n',
                        cssC,
                        '\n\n',
                        '/*----- style/d.css -----*/\n\n',
                        cssD,
                        '\n\n',
                        '/*----- Style tag #2 -----*/\n\n',
                        '.suffix {color: green;}',
                        '\n\n'
                        ].join(""));
            
            expect( fse.existsSync("style/a.css") )
                .equal(false);
            expect( fse.existsSync("style/b.css") )
                .equal(false);
            expect( fse.existsSync("style/subdir/c.css") )
                .equal(false);
            expect( fse.existsSync("style/d.css") )
                .equal(false);
            expect( fse.existsSync(sEmptyCssFile) )
                .equal(false);
            
            resetTestDir();
        });
        
        it("should collect styles into one specified file", function() {
            var sResultFile = "out/result/all",
                sResultPath = "new-dir/for/collected-result";
            check([
                    '<html>\n',
                        '<head>',
                            sEmptyCssLink,
                            '<title>\nCollect styles into one specified file</title>\n',
                            '<link rel="stylesheet" href="style/a.css">',
                            sEmptyCssLink,
                        '</head>\n',
                        '<body>\n',
                            '<link type="text/css" rel="stylesheet" href="style/subdir/c.css">',
                            '<h3>Some header</h3>\n',
                            '<div>Some content\n</div>\n',
                            '<style>\n\n',
                            '.the-end {\n    height: 100%;\n}\n',
                            '</style>',
                        '</body>\n',
                    '</html>'
                    ],
                    {cssFile: sResultFile},
                    [
                    '<html>\n',
                        '<head>',
                            '<title>\nCollect styles into one specified file</title>\n',
                            '<link rel="stylesheet" href="', sResultFile, '.css">',
                        '</head>\n',
                        '<body>\n',
                            '<h3>Some header</h3>\n',
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ]);
            
            sResultFile += ".css";
            expect( fse.existsSync(sResultFile) )
                .equal(true);
            expect( getFileContent(sResultFile) )
                .equal([
                        '/*----- style/a.css -----*/\n\n',
                        getFileContent("style/a.css"),
                        '\n\n',
                        '/*----- style/subdir/c.css -----*/\n\n',
                        getFileContent("style/subdir/c.css"),
                        '\n\n',
                        '/*----- Style tag #1 -----*/\n\n',
                        '\n\n',
                        '.the-end {\n    height: 100%;\n}\n',
                        '\n\n'
                        ].join(""));
            
            
            sResultFile = "collection";
            check([
                    '<html>\n',
                        '<head>',
                            '<style>\n.first-class {\n    top: 0;\n}\n\n</style>',
                            '<title>\nCollect styles into one specified file in destination directory</title>\n',
                            '<link rel="stylesheet" href="style/d.css">',
                            sEmptyCssLink,
                        '</head>\n',
                        '<body>\n',
                            '<style>\n.second-class {\ttop: 10%;}\n</style>',
                            '<h3>Some header</h3>\n',
                            sNonExistentLink,
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>',
                    '<link href="style/b.css" type="text/css" rel="stylesheet">'
                    ],
                    {cssFile: sResultFile, destDir: sResultPath},
                    [
                    '<html>\n',
                        '<head>',
                            '<link rel="stylesheet" type="text/css" href="', sResultFile, '.css">',
                            '<title>\nCollect styles into one specified file in destination directory</title>\n',
                        '</head>\n',
                        '<body>\n',
                            '<h3>Some header</h3>\n',
                            sNonExistentLink,
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ]);
            
            sResultFile = path.join(sResultPath, sResultFile +  ".css");
            expect( fse.existsSync(sResultFile) )
                .equal(true);
            expect( getFileContent(sResultFile) )
                .equal([
                        '/*----- Style tag #1 -----*/\n\n',
                        '\n.first-class {\n    top: 0;\n}\n\n',
                        '\n\n',
                        '/*----- style/d.css -----*/\n\n',
                        getFileContent("style/d.css"),
                        '\n\n',
                        '/*----- Style tag #2 -----*/\n\n',
                        '\n.second-class {\ttop: 10%;}\n',
                        '\n\n',
                        '/*----- style/b.css -----*/\n\n',
                        getFileContent("style/b.css"),
                        '\n\n'
                        ].join(""));
            
            resetTestDir();
        });
        
        it("should collect styles into several files", function() {
            check([
                    '<html>\n',
                        '<head>',
                            '<title>\nCollect styles into several files</title>\n',
                            '<link rel="stylesheet" href="style/a.css">',
                            '<style type="text/css">\n',
                                '.alpha {height: 5em;}\n',
                            '</style>',
                            sEmptyCssLink,
                            '<link type="text/css" href="style/d.css" rel="stylesheet">',
                            sEmptyCssLink,
                        '</head>\n',
                        '<body>\n',
                            sNonExistentLink,
                            '<link type="text/css" rel="stylesheet" href="style/subdir/c.css">',
                            '<h3>Some header</h3>\n',
                            '<style>\n',
                                '.nano {width: 1px;\nheight: 1px;\n}',
                            '</style>',
                            '<link rel="stylesheet" type="text/css" href="style/b.css">',
                            sNonExistentLink,
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ],
                    {collectStyle: false},
                    [
                    '<html>\n',
                        '<head>',
                            '<title>\nCollect styles into several files</title>\n',
                            '<link rel="stylesheet" href="style1.css">',
                            '<style type="text/css">\n',
                                '.alpha {height: 5em;}\n',
                            '</style>',
                            '<link type="text/css" href="style2.css" rel="stylesheet">',
                        '</head>\n',
                        '<body>\n',
                            sNonExistentLink,
                            '<h3>Some header</h3>\n',
                            '<style>\n',
                                '.nano {width: 1px;\nheight: 1px;\n}',
                            '</style>',
                            '<link rel="stylesheet" type="text/css" href="style3.css">',
                            sNonExistentLink,
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ]);
            
            expect( fse.existsSync("style1.css") )
                .equal(true);
            expect( getFileContent("style1.css") )
                .equal([
                        '/*----- style/a.css -----*/\n\n',
                        getFileContent("style/a.css"),
                        '\n\n'
                        ].join(""));
            
            expect( fse.existsSync("style2.css") )
                .equal(true);
            expect( getFileContent("style2.css") )
                .equal([
                        '/*----- style/d.css -----*/\n\n',
                        getFileContent("style/d.css"),
                        '\n\n',
                        '/*----- style/subdir/c.css -----*/\n\n',
                        getFileContent("style/subdir/c.css"),
                        '\n\n'
                        ].join(""));
            
            expect( fse.existsSync("style3.css") )
                .equal(true);
            expect( getFileContent("style3.css") )
                .equal([
                        '/*----- style/b.css -----*/\n\n',
                        getFileContent("style/b.css"),
                        '\n\n'
                        ].join(""));
            
            resetTestDir();
        });
        
        it("should collect and minify styles into several specified files", function() {
            var sResultFile = "path_to/some/result-dir/build";
            check([
                    '<html>\n',
                        '<head>',
                            '<link href="style/d.css" type="text/css" rel="stylesheet">',
                            '<title>\nCollect and minify styles into several specified files</title>\n',
                            sEmptyCssLink,
                            '<link rel="stylesheet" href="style/b.css">',
                            '<style type="text/css">\n',
                                '.omega {right: 14px;}\n',
                            '</style>',
                            sNonExistentLink,
                            sEmptyCssLink,
                        '</head>\n',
                        '<body>\n',
                            '<h3>Some header</h3>\n',
                            '<link rel="stylesheet" type="text/css" href="style/a.css">',
                            sEmptyCssLink,
                            sNonExistentLink,
                            '<link type="text/css" rel="stylesheet" href="style/subdir/c.css">',
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ],
                    {cssFile: sResultFile, collectStyle: false, minifyCss: true},
                    [
                    '<html>\n',
                        '<head>',
                            '<link href="', sResultFile, '1.css" type="text/css" rel="stylesheet">',
                            '<title>\nCollect and minify styles into several specified files</title>\n',
                            '<style type="text/css">\n',
                                '.omega {right: 14px;}\n',
                            '</style>',
                            sNonExistentLink,
                        '</head>\n',
                        '<body>\n',
                            '<h3>Some header</h3>\n',
                            '<link rel="stylesheet" type="text/css" href="', sResultFile, '2.css">',
                            sNonExistentLink,
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ]);
            
            expect( fse.existsSync(sResultFile + "1.css") )
                .equal(true);
            expect( getFileContent(sResultFile + "1.css") )
                .equal([
                        getFileContent("style/d.min.css"),
                        getFileContent("style/b.min.css")
                        ].join(""));
            
            expect( fse.existsSync(sResultFile + "2.css") )
                .equal(true);
            expect( getFileContent(sResultFile + "2.css") )
                .equal([
                        getFileContent("style/a.min.css"),
                        getFileContent("style/subdir/c.min.css")
                        ].join(""));
            
            resetTestDir();
        });
        
        it("should collect CSS-files from given directory into one specified file", function() {
            var sResultFile = "a/b/c/d/e/f/g/h/i/j/k/result";
            check([
                    '<html>\n',
                        '<head>',
                            '<style>\n',
                                '.fullscreen {\n',
                                '    left: 0;\n',
                                '    top: 0;\n',
                                '    width: 100%;\n',
                                '    height: 100%;\n',
                                '}\n',
                            '</style>',
                            '<title>\nCollect CSS-files from given directory into one specified file</title>\n',
                            '<link type="text/css" rel="stylesheet" href="../a.css">',
                            '<link type="text/css" rel="stylesheet" href="empty.css">',
                            sNonExistentLink,
                            '<link href="style/b.css" rel="super-sheet">',
                            '<link href="../b.css" rel="stylesheet">',
                        '</head>\n',
                        '<body>\n',
                            '<link rel="stylesheet" type="text/css" href="../d.css">',
                            '<h3>Some header</h3>\n',
                            '<link type="text/css" rel="stylesheet" href="c.css">',
                            '<div>Some content\n</div>\n',
                            '<style>\n',
                                '.normal {\n',
                                '    left: 10%;\n',
                                '    top: 10%;\n',
                                '    width: 35%;\n',
                                '    height: 35%;\n',
                                '}\n',
                            '</style>',
                        '</body>\n',
                    '</html>'
                    ],
                    {sourceDir: 'style/subdir', cssFile: sResultFile},
                    [
                    '<html>\n',
                        '<head>',
                            '<link rel="stylesheet" type="text/css" href="', sResultFile, '.css">',
                            '<title>\nCollect CSS-files from given directory into one specified file</title>\n',
                            sNonExistentLink,
                            '<link href="style/b.css" rel="super-sheet">',
                        '</head>\n',
                        '<body>\n',
                            '<h3>Some header</h3>\n',
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ]);
            
            sResultFile += ".css";
            expect( fse.existsSync(sResultFile) )
                .equal(true);
            expect( getFileContent(sResultFile) )
                .equal([
                        '/*----- Style tag #1 -----*/\n\n',
                        '\n',
                        '.fullscreen {\n',
                        '    left: 0;\n',
                        '    top: 0;\n',
                        '    width: 100%;\n',
                        '    height: 100%;\n',
                        '}\n',
                        '\n\n',
                        '/*----- ../a.css -----*/\n\n',
                        getFileContent("style/a.css"),
                        '\n\n',
                        '/*----- ../b.css -----*/\n\n',
                        getFileContent("style/b.css"),
                        '\n\n',
                        '/*----- ../d.css -----*/\n\n',
                        getFileContent("style/d.css"),
                        '\n\n',
                        '/*----- c.css -----*/\n\n',
                        getFileContent("style/subdir/c.css"),
                        '\n\n',
                        '/*----- Style tag #2 -----*/\n\n',
                        '\n',
                        '.normal {\n',
                        '    left: 10%;\n',
                        '    top: 10%;\n',
                        '    width: 35%;\n',
                        '    height: 35%;\n',
                        '}\n',
                        '\n\n'
                        ].join(""));
            
            resetTestDir();
        });
        
        it("should skip specified CSS-files and include all collected styles", function() {
            check([
                    '<html>\n',
                        '<head>',
                            sEmptyCssLink,
                            '<link rel="stylesheet" href="style/d.css">',
                            '<title>\nSkip CSS-file and include collected styles</title>\n',
                            sNonExistentLink,
                            '<style>p {\ntext-align: justify;\n}\n</style>',
                            '<link type="text/css" rel="stylesheet" href="style/subdir/skip-me.css">',
                        '</head>\n',
                        '<body>\n',
                            '<h3>Some header</h3>',
                            sNonExistentLink,
                            '<link type="text/css" rel="stylesheet" href="style/subdir/c.css">',
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ],
                    {include: true, skipCssFile: "skip-me"},
                    [
                    '<html>\n',
                        '<head>',
                            '<style>\n',
                                '/*----- style/d.css -----*/\n\n',
                                getFileContent("style/d.css"),
                                '\n\n',
                                '/*----- Style tag #1 -----*/\n\n',
                                'p {\ntext-align: justify;\n}\n',
                                '\n\n',
                            '</style>',
                            '<title>\nSkip CSS-file and include collected styles</title>\n',
                            sNonExistentLink,
                            '<link type="text/css" rel="stylesheet" href="style/subdir/skip-me.css">',
                        '</head>\n',
                        '<body>\n',
                            '<h3>Some header</h3>',
                            sNonExistentLink,
                            '<style>\n',
                                '/*----- style/subdir/c.css -----*/\n\n',
                                getFileContent("style/subdir/c.css"),
                                '\n\n',
                            '</style>',
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ]);
            
            check([
                    '<html>\n',
                        '<head>',
                            sEmptyCssLink,
                            '<style>.head {margin: 5px; font-weight: bold;}</style>',
                            '<title>\nSkip several CSS-files and include collected styles</title>\n',
                            '<link href="style/a.css" rel="stylesheet" type="text/css">',
                            sNonExistentLink,
                            '<link rel="stylesheet" href="style/b.css" type="text/css">',
                        '</head>\n',
                        '<body>\n',
                            sEmptyCssLink,
                            sNonExistentLink,
                            '<h3>Some header</h3>',
                            '<link type="text/css" rel="stylesheet" href="style/subdir/skip-me.css">',
                            sEmptyCssLink,
                            '<link type="text/css" rel="stylesheet" href="style/d.css">',
                            '<div>Some content\n</div>\n',
                            '<link type="text/css" rel="stylesheet" href="style/subdir/c.css">',
                            sEmptyCssLink,
                        '</body>\n',
                    '</html>'
                    ],
                    {include: true, skipCssFile: [sEmptyCssFile, "subdir/skip-me", "b"]},
                    [
                    '<html>\n',
                        '<head>',
                            sEmptyCssLink,
                            '<style>\n',
                                '/*----- Style tag #1 -----*/\n\n',
                                '.head {margin: 5px; font-weight: bold;}',
                                '\n\n',
                                '/*----- style/a.css -----*/\n\n',
                                getFileContent("style/a.css"),
                                '\n\n',
                            '</style>',
                            '<title>\nSkip several CSS-files and include collected styles</title>\n',
                            sNonExistentLink,
                            '<link rel="stylesheet" href="style/b.css" type="text/css">',
                        '</head>\n',
                        '<body>\n',
                            sEmptyCssLink,
                            sNonExistentLink,
                            '<h3>Some header</h3>',
                            '<link type="text/css" rel="stylesheet" href="style/subdir/skip-me.css">',
                            sEmptyCssLink,
                            '<style>\n',
                                '/*----- style/d.css -----*/\n\n',
                                getFileContent("style/d.css"),
                                '\n\n',
                                '/*----- style/subdir/c.css -----*/\n\n',
                                getFileContent("style/subdir/c.css"),
                                '\n\n',
                            '</style>',
                            '<div>Some content\n</div>\n',
                            sEmptyCssLink,
                        '</body>\n',
                    '</html>'
                    ]);
        });
        
        it("should skip specified CSS-files and collect styles into several files", function() {
            var sResultFile;
            
            check([
                    '<html>\n',
                        '<head>',
                            '<link rel="stylesheet" href="style/b.css">',
                            sEmptyCssLink,
                            '<link rel="stylesheet" href="style/d.css" type="text/css">',
                            '<title>\nSkip CSS-file and save collected styles into files</title>\n',
                            sNonExistentLink,
                            '<style>p {\ntext-align: justify;\n}\n</style>',
                        '</head>\n',
                        '<body>\n',
                            '<h3>Some header</h3>',
                            '<link type="text/css" rel="stylesheet" href="style/subdir/skipthis.css">',
                            '<style>\n    h4 {text-align: right;\n}</style>',
                            '<link type="text/css" rel="stylesheet" href="style/subdir/c.css">',
                            sEmptyCssLink,
                            '<link href="style/a.css" rel="stylesheet">',
                            sNonExistentLink,
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ],
                    {skipCssFile: "skipthis"},
                    [
                    '<html>\n',
                        '<head>',
                            '<link rel="stylesheet" href="style1.css">',
                            '<title>\nSkip CSS-file and save collected styles into files</title>\n',
                            sNonExistentLink,
                        '</head>\n',
                        '<body>\n',
                            '<h3>Some header</h3>',
                            '<link type="text/css" rel="stylesheet" href="style/subdir/skipthis.css">',
                            '<link rel="stylesheet" type="text/css" href="style2.css">',
                            sNonExistentLink,
                            '<div>Some content\n</div>\n',
                        '</body>\n',
                    '</html>'
                    ]);
            
            sResultFile = "style1.css";
            expect( fse.existsSync(sResultFile) )
                .equal(true);
            expect( getFileContent(sResultFile) )
                .equal([
                        '/*----- style/b.css -----*/\n\n',
                        getFileContent("style/b.css"),
                        '\n\n',
                        '/*----- style/d.css -----*/\n\n',
                        getFileContent("style/d.css"),
                        '\n\n',
                        '/*----- Style tag #1 -----*/\n\n',
                        'p {\ntext-align: justify;\n}\n',
                        '\n\n'
                        ].join(""));
            
            sResultFile = "style2.css";
            expect( fse.existsSync(sResultFile) )
                .equal(true);
            expect( getFileContent(sResultFile) )
                .equal([
                        '/*----- Style tag #2 -----*/\n\n',
                        '\n    h4 {text-align: right;\n}',
                        '\n\n',
                        '/*----- style/subdir/c.css -----*/\n\n',
                        getFileContent("style/subdir/c.css"),
                        '\n\n',
                        '/*----- style/a.css -----*/\n\n',
                        getFileContent("style/a.css"),
                        '\n\n'
                        ].join(""));
            
            resetTestDir();
            
            
            sResultFile = "path/to/build/combi";
            check([
                    '<html>\n',
                        '<head>',
                            '<title>\nSkip several CSS-files and save collected styles into files</title>\n',
                            sEmptyCssLink,
                            '<link href="style/b.css" rel="stylesheet" type="text/css">',
                            '<style>\n\n\n   .head {margin: 5px; font-weight: bold;}\n\n\n</style>',
                            '<link rel="stylesheet" href="style/a.css" type="text/css">',
                            sNonExistentLink,
                        '</head>\n',
                        '<body>\n',
                            sNonExistentLink,
                            sEmptyCssLink,
                            '<style>.fresh {color: #468c00;}</style>',
                            '<h3>Some header</h3>',
                            '<link href="path/to/some-dir/break.css" rel="stylesheet">',
                            '<link type="text/css" rel="stylesheet" href="style/subdir/c.css">',
                            '<div>Some content\n</div>\n',
                            '<link type="text/css" rel="stylesheet" href="style/d.css">',
                            sEmptyCssLink,
                        '</body>\n',
                    '</html>'
                    ],
                    {cssFile: sResultFile, skipCssFile: [sEmptyCssFile, "path/to/some-dir/break", "b"]},
                    [
                    '<html>\n',
                        '<head>',
                            '<title>\nSkip several CSS-files and save collected styles into files</title>\n',
                            sEmptyCssLink,
                            '<link href="style/b.css" rel="stylesheet" type="text/css">',
                            '<link rel="stylesheet" type="text/css" href="', sResultFile, '1.css">',
                            sNonExistentLink,
                        '</head>\n',
                        '<body>\n',
                            sNonExistentLink,
                            sEmptyCssLink,
                            '<link rel="stylesheet" type="text/css" href="', sResultFile, '2.css">',
                            '<h3>Some header</h3>',
                            '<link href="path/to/some-dir/break.css" rel="stylesheet">',
                            '<link type="text/css" rel="stylesheet" href="', sResultFile, '3.css">',
                            '<div>Some content\n</div>\n',
                            sEmptyCssLink,
                        '</body>\n',
                    '</html>'
                    ]);
            
            expect( fse.existsSync(sResultFile + "1.css") )
                .equal(true);
            expect( getFileContent(sResultFile + "1.css") )
                .equal([
                        '/*----- Style tag #1 -----*/\n\n',
                        '\n\n\n   .head {margin: 5px; font-weight: bold;}\n\n\n',
                        '\n\n',
                        '/*----- style/a.css -----*/\n\n',
                        getFileContent("style/a.css"),
                        '\n\n'
                        ].join(""));
            
            expect( fse.existsSync(sResultFile + "2.css") )
                .equal(true);
            expect( getFileContent(sResultFile + "2.css") )
                .equal([
                        '/*----- Style tag #2 -----*/\n\n',
                        '.fresh {color: #468c00;}',
                        '\n\n'
                        ].join(""));
            
            expect( fse.existsSync(sResultFile + "3.css") )
                .equal(true);
            expect( getFileContent(sResultFile + "3.css") )
                .equal([
                        '/*----- style/subdir/c.css -----*/\n\n',
                        getFileContent("style/subdir/c.css"),
                        '\n\n',
                        '/*----- style/d.css -----*/\n\n',
                        getFileContent("style/d.css"),
                        '\n\n'
                        ].join(""));
            
            resetTestDir();
        });
    });
    
    
    describe(".collectCssInFile", function() {
        beforeEach(resetTestDir);
        
        var collectCssInFile = uniator.collectCssInFile;
        
        function getResultDir(list) {
            if (! Array.isArray(list)) {
                list = [].slice.call(arguments);
            }
            list = ["../expected"].concat(list);
            return path.join.apply(null, list);
        }
        
        function check(sourceFile, settings, resultFile) {
            sourceFile += ".html";
            if (typeof settings === "string") {
                resultFile = settings;
                settings = null;
            }
            if (resultFile) {
                resultFile += ".html";
            }
            else {
                resultFile = sourceFile;
            }
            
            resultFile = getResultDir(path.basename(resultFile, ".html"), resultFile);
            var result = collectCssInFile(sourceFile, settings);
            expect( getFileContent(result.file) )
                .equal( getFileContent(resultFile) );
        }
        
        it("should include collected styles into source HTML-file", function() {
            check("rewrite_include", {include: true});
        });
        
        it("should collect minified styles into one CSS-file and overwrite source HTML-file", function() {
            var sName = "rewrite_minify",
                sResultDir = getResultDir(sName),
                sCssFile = "css/combined";
            check(sName, {minifyCss: true, cssFile: sCssFile});
            
            sCssFile += ".css";
            expect( fse.existsSync(sCssFile) )
                .equal(true);
            expect( getFileContent(sCssFile) )
                .equal( getFileContent( path.join(sResultDir, "style.css") ) );
        });
        
        it("should collect styles into several CSS-files and overwrite source HTML-file", function() {
            var sName = "rewrite_links",
                sResultDir = getResultDir(sName);
            check(sName, {collectStyle: false, cssFile: "css/style"});
            
            expect( fse.existsSync("css/style1.css") )
                .equal(true);
            expect( getFileContent("css/style1.css") )
                .equal( getFileContent( path.join(sResultDir, "style1.css") ) );
            expect( fse.existsSync("css/style2.css") )
                .equal(true);
            expect( getFileContent("css/style2.css") )
                .equal( getFileContent( path.join(sResultDir, "style2.css") ) );
        });
        
        it("should collect styles into one CSS-file and create new HTML-file", function() {
            var sName = "newfile_link",
                sResultDir = getResultDir(sName);
            check(sName, {destFile: "out/result.html"});
            
            expect( fse.existsSync("out/style.css") )
                .equal(true);
            expect( getFileContent("out/style.css") )
                .equal( getFileContent( path.join(sResultDir, "style.css") ) );
        });
    });

});
