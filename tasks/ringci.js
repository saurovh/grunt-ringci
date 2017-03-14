/*
 * grunt-ringci
 * https://github.com/dostokhan/grunt-ringci
 *
 * Copyright (c) 2016 Moniruzzaman Monir
 * Licensed under the MIT license.
 */

'use strict';

module.exports = exportTask;

function exportTask(grunt) {
  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

    grunt.registerMultiTask('ringci', 'Custom Build for ringWEB', ringci);

    function ringci() {
        var taskSuccess,
            jsPath = '',
            SCRIPT_FILES = [],
            linkScripts = [],
            linkStyles = [],
            // STYLE_SHEETS = [],
            // srcFiles = [],
    // Merge task-specific and/or target-specific options with these defaults.
            options = this.options({
                punctuation: '.',
                separator: ', ',
            }),
            fs = require('fs'),
            Crypto = require('crypto'),
            Path = require('path'),
            // cssmin = require('cssmin'),
            ringHelper = require('./lib/helpers').init(grunt, options);

        jsPath = options.minifyScripts === true ? '/js/' : '/js/build/';
        linkStyles = options.minifyStyles === true ? ['css/styles.min.css'] : ['css/styles.css'];


        ringHelper.log('info', 'TARGET: ', options.target);
        // fixPlayerUrl();
        // main tasks 4 sets of files to watch for
        // 1. minify partial templates
        taskSuccess = prepareHtml();
        // 2. prepare js files
            // copy files, run operations(remove debug code, update settings, minify), write to js directory
        if (taskSuccess) {
            taskSuccess = prepareJS();
        }

        if (taskSuccess) {
            taskSuccess = prepareVendorScripts();
        }
        // 3. prepare css files
        // // run sass and write to css directory
        // if (taskSuccess) {
        //     taskSuccess = prepareCss();
        // }
        // 4. prepare root template files and link if necessary
        if (taskSuccess) {
            taskSuccess = prepareRootTemplates();
        }
        // // link css and js files and then write to public directory
        // 5. worker files
        // // importscript replace with file content and minify and write to js/worker directory
        if (taskSuccess) {
            taskSuccess = prepareWorkerFiles();
        }
        // for chat workers, copy and minify if necessary
        if (taskSuccess) {
            taskSuccess = prepareChatWorkers();
        }


        function fixUrls(content) {
            // var playerTemplate = options.publicPath + '/player/embed.html',
            var searches = ['http://local.ringid.com'],
                updatedContent,
                replaces = [],
                i;

            // ringHelper.log('info', 'MOBILE SITE URL FIX', playerTemplate);
            ringHelper.log('info', 'Task Target', grunt.task.current.nameArgs);

            switch (grunt.task.current.nameArgs) {
                case 'ringci:local':
                    if (options.protocol === 'ssl') {
                        searches.push('http://devmediacloud');
                        replaces.push('https://local.ringid.com', 'https://devmediacloud');
                        updatedContent = replaceUrlFixes();
                    } else {
                        updatedContent = content;
                    }
                    break;
                case 'ringci:dev':
                    if (options.protocol === 'ssl') {
                        searches.push('http://devmediacloud');
                        replaces.push('https://dev.ringid.com', 'https://devmediacloud');
                    } else {
                        replaces.push('http://dev.ringid.com');
                    }
                    updatedContent = replaceUrlFixes();
                    break;
                case 'ringci:stage':
                    if (options.protocol === 'ssl') {
                        searches.push('http://devmediacloud');
                        replaces = ['https://pro.ringid.com', 'https://mediacloud'];
                    } else {
                        searches.push('http://devmediacloud');
                        replaces = ['http://pro.ringid.com', 'http://mediacloud'];
                    }
                    updatedContent = replaceUrlFixes();
                    break;
                case 'ringci:live':
                    if (options.protocol === 'ssl') {
                        searches.push('http://devmediacloud');
                        replaces = ['https://www.ringid.com', 'https://mediacloud'];
                    } else {
                        searches.push('http://devmediacloud');
                        replaces = ['http://www.ringid.com', 'http://mediacloud'];
                    }
                    updatedContent = replaceUrlFixes();
                    break;
                default:
                    ringHelper.log('warning', 'Unknown target', options.target);
                    updatedContent = content;
            }

            function replaceUrlFixes() {
                var modified;
                // var content = grunt.file.read(playerTemplate, { encoding: 'utf8' });

                if (!content) {
                    return content;
                }
                ringHelper.log('info', 'searches:' + searches.length, 'replaces:' + replaces.length);

                modified = String(content);
                for (i = 0; i < searches.length; i++) {
                    ringHelper.log('info', 'Replace', searches[i], replaces[i]);
                    modified = modified.replace(new RegExp(searches[i], 'g'), replaces[i]);
                }
                // grunt.file.write(playerTemplate, content);
                return modified;
            }

            return updatedContent;
        }

        function prepareVendorScripts() {
            var vendorMinFile = options.publicPath + '/js/' + Crypto.createHash('md5').update('app-vendor.min.js' + new Date().getTime()).digest('hex') + '.js',
                vendorScripts = [],
                uglifiedContent,
                srcPath = '',
                minSrcPath = '',
                minifiedScript = '',
                filename = '',
                destPath = '',
                i;
                // err;

            ringHelper.log('taskstart', 'BUILDING app.vendor.min');

            for (i = 0; i < options.vendorFiles.length; i++) {
                srcPath = options.srcPath + '/' + options.vendorFiles[i];
                if (grunt.file.exists(srcPath)) {
                    if (options.minifyScripts) {
                        // is a minified file?
                        if (srcPath.indexOf('min') === -1) {
                            minSrcPath = srcPath.substr(0, srcPath.lastIndexOf('.')) + '.min' + srcPath.substr(srcPath.lastIndexOf('.'));
                            // exists a minified file in the same dir of the src file?
                            if (grunt.file.exists(minSrcPath)) {
                                ringHelper.log('info', 'Got Minified', minSrcPath);
                                minifiedScript += grunt.file.read(minSrcPath, { encoding: 'utf8' });
                            } else {
                                // need to minify
                                ringHelper.log('info', 'Not Minified: ', srcPath);
                                uglifiedContent = ringHelper.uglify(srcPath, '', true);

                                if (uglifiedContent) {
                                    minifiedScript += uglifiedContent;
                                } else {
                                    return false;
                                }
                            }
                        } else {
                            ringHelper.log('info', 'File', srcPath);
                            // already minified  no need to minify
                            minifiedScript += String(grunt.file.read(srcPath, { encoding: 'utf8' }));
                        }
                    } else {
                        filename = srcPath.substr(srcPath.lastIndexOf('/') + 1);
                        destPath = options.publicPath + jsPath + filename;
                        grunt.file.copy(srcPath, destPath);
                        ringHelper.log('info', 'VendorFile', filename, destPath);
                        // linkScripts = [destPath.replace(options.publicPath, '')].concat(linkScripts);
                        vendorScripts.push(destPath.replace(options.publicPath, ''));
                    }
                } else {
                    ringHelper.log('error', 'File', srcPath, 'Not found');
                    return false;
                }
            }

            if (options.minifyScripts) {
                grunt.file.write(vendorMinFile, minifiedScript);
                ringHelper.log('success', 'Uglify', vendorMinFile);
                vendorScripts.push(vendorMinFile.replace(options.publicPath, ''));
            }

            // linkScripts = [vendorMinFile.replace(options.publicPath, '')].concat(linkScripts);
            linkScripts = vendorScripts.concat(linkScripts);

            ringHelper.log('taskend', 'DONE BUILDING app.vendor.min');
            return true;
        }


        function prepareChatWorkers() {
            var files = [],
                filename,
                src,
                dest,
                j,
                i;

            ringHelper.log('taskstart', 'Copy Chat worker files');
            for (i = 0; i < options.chatWorkers.length; i++) {
                src = options.srcPath + '/' + options.chatWorkers[i].src;
                dest = options.publicPath + '/' + options.chatWorkers[i].dest;

                ringHelper.log('info', 'chatWorker', src, dest);
                files = getFiles(src, [], 'js', true);
                for (j = 0; j < files.length; j++) {
                    filename = files[j].substr(files[j].lastIndexOf('/') + 1);

                    if (options.minifyScripts) {
                        ringHelper.uglify(files[j], dest + '/' + filename);
                    } else {
                        ringHelper.log('info', 'workerFile: ', files[j], dest + '/' + filename);
                        grunt.file.copy(files[j], dest + '/' + filename);
                    }
                }
            }
            ringHelper.log('taskend', 'End Copy Chat worker files');
        }


        function prepareWorkerFiles() {
            var importScriptsRegex = /importScripts\(['|"]([^'|"])*["|']\);/g,
                regexMatches,
                workerFile,
                // supportFiles = [],
                i,
                j,
                mainWorker,
                workerFileContent = '',
                srcPath,
                srcFile,
                dest = options.publicPath + '/js/worker/';

            ringHelper.log('taskstart', 'Prepare Worker Files');
            for (i = 0; i < options.workerFiles.length; i++) {
                // srcPath = Path.resolve(options.appSrcPath + options.workerFiles[i].substr(0, options.workerFiles[i].lastIndexOf('/') + 1));
                srcPath = options.srcPath + '/' + options.workerFiles[i].substr(0, options.workerFiles[i].lastIndexOf('/') + 1);
                workerFile = options.workerFiles[i].substr(options.workerFiles[i].lastIndexOf('/') + 1);

                ringHelper.log('info', 'Worker File', srcPath + workerFile, dest + workerFile);
                if (grunt.file.exists(srcPath + workerFile)) {
                    mainWorker = String(grunt.file.read(srcPath + workerFile, { encoding: 'utf8' }));
                // process all worker files
                    regexMatches = mainWorker.match(importScriptsRegex);
                    if (regexMatches && regexMatches.length > 0) {
                        for (j = 0; j < regexMatches.length; j++) {
                            // srcFile = Path.resolve(regexMatches[j].substr(15, regexMatches[j].length - 15 - 3));
                            srcFile = regexMatches[j].substr(15, regexMatches[j].length - 15 - 3);

                            if (grunt.file.exists(Path.resolve(srcPath + srcFile))) {
                                if (options.minifyScripts === true) {
                                    // ringHelper.log('success', 'Included File', Path.resolve((srcPath + srcFile)));
                                    ringHelper.log('success', 'Included File', (srcPath + srcFile));
                                    // insert all supportFiles inside worker file content;
                                    // workerFileContent += String(grunt.file.read(Path.resolve(srcPath + srcFile), { encoding: 'utf8' })) + '\n';
                                    workerFileContent += String(grunt.file.read((srcPath + srcFile), { encoding: 'utf8' })) + '\n';
                                    mainWorker = mainWorker.replace(regexMatches[j], '');
                                } else {
                                    // ringHelper.log('info', 'Copy', Path.resolve((srcPath + srcFile)), Path.resolve(dest + srcFile));
                                    ringHelper.log('info', 'Copy', (srcPath + srcFile), (dest + srcFile));
                                    // grunt.file.copy(Path.resolve(srcPath + srcFile), Path.resolve(dest + srcFile));
                                    grunt.file.copy((srcPath + srcFile), (dest + srcFile));
                                }
                            } else {
                                // ringHelper.log('error', 'File', Path.resolve(srcPath + srcFile), ' Not Found');
                                ringHelper.log('error', 'File', (srcPath + srcFile), ' Not Found');
                                return false;
                            }
                        }

                        if (options.minifyScripts === true) {
                        // workerFileContent += grunt.file.read(srcPath + workerFile, {encoding: 'utf8'});
                            grunt.file.write(dest + workerFile, workerFileContent + '\n' + mainWorker);
                            if (!ringHelper.uglify(dest + workerFile, dest + workerFile)) {
                                return false;
                            }
                        } else {
                            grunt.file.copy((srcPath + workerFile), (dest + workerFile));
                        }
                    } else {
                        ringHelper.log('error', 'Regex Match', srcPath, workerFile);
                        return false;
                    }
                } else {
                    ringHelper.log('error', 'File', srcPath + workerFile, ' Not Found');
                    return false;
                }
            }

            ringHelper.log('taskend', 'Done: Prepare Worker Files');

            return true;
        }

        function prepareRootTemplates() {
            var i,
                temp,
                content,
                minifiedContent,
                files = getFiles(options.srcPath, [], 'html', true);

            ringHelper.log('taskstart', 'Prepare Root Templates, link css,js and minify');
            ringHelper.log('info', 'Templates', 'count', files.length);
            // minify and copy
            // for dashboard and index.html link html and css files
            for (i = 0; i < files.length; i++) {
                // ringHelper.log('info', 'rootTemplate', files[i]);
                content = grunt.file.read(files[i], { encoding: 'utf8' });
                temp = files[i].replace(options.srcPath + '/', '');
                // fix urls and protocols
                // content = content.replace('local.ringid.com', options.targetUrl);
                // if (temp === 'index.html' || temp === 'dashboard.html') {
                if (options.linkTemplates.indexOf(temp) > -1) {
                    ringHelper.log('info', 'link script and css in', files[i]);
                    content = fixUrls(content);
                    minifiedContent = linkHtmlCss(content);
                } else {
                    minifiedContent = ringHelper.minifyHtml(content);
                }

                if (!minifiedContent) {
                    ringHelper.log('error', 'rootTemplate', files[i], 'Failed');
                }
                grunt.file.write(files[i].replace(options.srcPath, options.publicPath), minifiedContent);
            }
            ringHelper.log('taskend', 'Prepare Root Templates, link css,js and minify');
            return true;
        }

        function linkHtmlCss(templateContent) {
            var modifiedContent = String(templateContent);
            // link scripts (content, files, startTag, endTag, template)
            //
            modifiedContent = ringHelper.linkFiles(
                modifiedContent,
                linkScripts,
                '<!--SCRIPTS-->',
                '<!--SCRIPTS END-->',
                '<script  src=\'%s\' ></script>');
            // link styles
            modifiedContent = ringHelper.linkFiles(
                modifiedContent,
                linkStyles,
                '<!--STYLES-->',
                '<!--STYLES END-->',
                '<link rel=\'stylesheet\' type=\'text/css\' href=\'%s\' />');
            return modifiedContent;
        }

        function prepareHtml() {
            // read all html files from pages folder, DONE
            // minify templates DONE
            // write to public directory DONE
            var i,
                templateDir = options.srcPath + '/pages',
                destination,
                templateContent,
                minifiedContent,
                files = [];

            ringHelper.log('taskstart', 'MINIFY Template Files');
            files = getFiles(templateDir, [], 'html');

            for (i = 0; i < files.length; i++) {
                templateContent = grunt.file.read(files[i], { encoding: 'utf8' });
                if (templateContent) {
                    minifiedContent = ringHelper.minifyHtml(templateContent);
                    if (!minifiedContent) {
                        minifiedContent = templateContent;
                        ringHelper.log('warning', 'Htmlmin', files[i], 'copying without minification');
                    }

                    destination = files[i].replace(templateDir, options.publicPath + '/templates');

                    // ringHelper.log('info', 'templateName: ', files[i], destination);
                    grunt.file.write(destination, minifiedContent);
                } else {
                    ringHelper.log('warning', 'Htmlmin', files[i], 'Empty file');
                }
            }
            ringHelper.log('taskend', 'DONE MINIFY Template Files');
            return true;
        }

        // function prepareCss() {
        //     var stylesMinFile = '/css/' + Crypto.createHash('md5').update('styles.min.css' + new Date().getTime()).digest('hex') + '.css',
        //         cssfile,
        //         i,
        //         minifiedStyle = '';

        //     ringHelper.log('taskstart', 'MINIFY STYLESHEETS USING CSSMIN');

        //     for (i = 0; i < options.appStyles.length; i++) {
        //         // cssfile = ringHelper.unixifyPath(options.appStyles[i]);
        //         cssfile = options.publicPath + '/' + options.appStyles[i];
        //         ringHelper.log('info', 'prepareCss', 'File: ', cssfile);
        //         if (!grunt.file.exists(cssfile)) {
        //             ringHelper.log('error', 'File', cssfile, ' Not Found');
        //             return false;
        //         }

        //         if (options.minifyStyles) {
        //             minifiedStyle += String(grunt.file.read(cssfile, { encoding: 'utf8' }));
        //         } else {
        //             linkStyles.push(cssfile.replace(options.publicPath, ''));
        //         }
        //     }

        //     if (options.minifyStyles) {
        //         ringHelper.log('success', 'prepareCss', 'Minify', options.publicPath + stylesMinFile);
        //         grunt.file.write(options.publicPath + stylesMinFile, cssmin(minifiedStyle));
        //         linkStyles = [stylesMinFile];
        //     }

        //     ringHelper.log('taskend', 'DONE MINIFY STYLESHEETS USING CSSMIN');
        //     return true;
        // }

        function prepareJS() {
            // copy files DONE
            // check if eslint s needed or not DONE
            // remove debug code DONE
            // update settings DONE
            // minify if necessary DONE
            // write to destination DONE
            var i,
                uglifyDone,
                appScriptContent = '',
                minifiedScriptFile = Crypto.createHash('md5').update('app.min.js' + new Date().getTime()).digest('hex') + '.js',
                path;

            ringHelper.log('taskstart', 'PREPARE APP SCRIPTS');

            if (!copyJSFiles()) {
                return false;
            }

            if (options.minifyScripts) {
                // concat script files
                for (i = 0; i < SCRIPT_FILES.length; i++) {
                    appScriptContent += SCRIPT_FILES[i].content + '\n';
                    // path = options.publicPath + jsPath + SCRIPT_FILES[i].name;
                    // ringHelper.log('info', 'write script to ', path);
                    // grunt.file.write(path, SCRIPT_FILES[i].content);
                }
                // write script file
                grunt.file.write(options.publicPath + jsPath + 'build/app.js', appScriptContent);
                uglifyDone = ringHelper.uglify(options.publicPath + jsPath + 'build/app.js', options.publicPath + jsPath + minifiedScriptFile);
                if (!uglifyDone) {
                    return false;
                }

                linkScripts.push(jsPath + minifiedScriptFile);
            } else if (options.concatScripts) {
                // concat script files
                for (i = 0; i < SCRIPT_FILES.length; i++) {
                    appScriptContent += SCRIPT_FILES[i].content + '\n';
                    // path = options.publicPath + jsPath + SCRIPT_FILES[i].name;
                    // ringHelper.log('info', 'write script to ', path);
                    // grunt.file.write(path, SCRIPT_FILES[i].content);
                }
                // write script file
                grunt.file.write(options.publicPath + jsPath + 'build/app.js', appScriptContent);
                uglifyDone = ringHelper.uglify(options.publicPath + jsPath + 'build/app.js', options.publicPath + jsPath + minifiedScriptFile);
                if (!uglifyDone) {
                    return false;
                }

                linkScripts.push(jsPath + 'build/app.js');
            } else {
                // write script files
                for (i = 0; i < SCRIPT_FILES.length; i++) {
                    path = options.publicPath + jsPath + SCRIPT_FILES[i].name;
                    grunt.file.write(path, SCRIPT_FILES[i].content);
                    linkScripts.push(path.replace(options.publicPath, ''));
                }
            }

            SCRIPT_FILES = [];

            ringHelper.log('taskend', 'DONE: PREPARE APP SCRIPTS');
            return true;
        }


        function copyJSFiles() {
            var i,
                k,
                d,
                srcPath,
                lintConfig = options.eslintOptions || {
                    configFile: '.eslintrc.json',
                },
                eslintModules,
                enableLinting = true,
                forceEslint = true,
                moduleContent = '',
                moduleContentStart = '(function(angular, window) { \'use strict\'; ',
                moduleContentEnd = '})(angular, window);';

            ringHelper.log('taskstart', 'Copy Scripts');
            // decide which modules need eslinting ?
            if (options.target === 'local' && grunt.file.exists('.eslintmodules')) {
                eslintModules = grunt.file.read('.eslintmodules', { encoding: 'utf8' });
                eslintModules = eslintModules.trim();
                    // .split('\n');
                if (eslintModules.length !== 0) {
                    eslintModules = eslintModules.split('\n');
                    for (i = 0; i < options.appModules.length; i++) {
                        if (eslintModules[0] === options.appModules[i].name) {
                            forceEslint = false;
                            break;
                        }
                    }
                }
            }
            ringHelper.log('info', 'Linting', 'Forced: ' + forceEslint);
            ringHelper.log('info', 'Debugging', 'Enabled: ' + options.debugEnabled);


            // copy debug files if necessary
            if (options.debugEnabled) {
                for (i = 0; i < options.debugFiles.length; i++) {
                    srcPath = options.srcPath + '/' + options.debugFiles[i];
                    if (grunt.file.exists(srcPath)) {
                        prepareFile(srcPath, 'debugfile');
                    } else {
                        ringHelper.log('error', 'File', srcPath, ' Not Found');
                        return false;
                    }
                }
            }

            // copy module files
            for (k = 0; k < options.appModules.length; k++) {
                enableLinting = forceEslint ||
                                (eslintModules.indexOf(options.appModules[k].name) > -1);
                // create and add module files
                if (options.appModules[k].name !== 'globals') {
                    moduleContent = '';
                    // ringHelper.log('info', 'module:', options.appModules[k].name);
                    if (options.appModules[k].dependencies.length > 0) {
                        moduleContent += ' angular.module(\'' + options.appModules[k].name + '\', [ ';
                        for (d = 0; d < options.appModules[k].dependencies.length; d++) {
                            moduleContent += '\'' + options.appModules[k].dependencies[d] + '\', ';
                        }
                        moduleContent = moduleContent.substr(0, moduleContent.length - 2);
                        moduleContent += ' ]); ';
                    } else {
                        moduleContent += ' angular.module(\'' + options.appModules[k].name + '\', []); ';
                    }
                    moduleContent = moduleContentStart + moduleContent + moduleContentEnd;

                    SCRIPT_FILES.push({
                        name: options.appModules[k].name + '.module.js',
                        content: moduleContent,
                    });
                }


                for (i = 0; i < options.appModules[k].files.length; i++) {
                    srcPath = options.srcPath + '/' + options.appModules[k].files[i];
                    if (grunt.file.exists(srcPath)) {
                        if (enableLinting) {
                            if (!ringHelper.lintScript(srcPath, lintConfig)) {
                                ringHelper.log('error', 'Lint', srcPath, 'Failed');
                                return false;
                            }
                        }

                        if (!prepareFile(srcPath, options.appModules[k].name)) {
                            return false;
                        }
                    } else {
                        ringHelper.log('error', 'File', srcPath, ' Not Found');
                        return false;
                    }
                }

                if (enableLinting) {
                    ringHelper.log('success', 'Lint Module', options.appModules[k].name);
                }
            }

            ringHelper.log('taskend', 'Done Copy Scripts');
            return true;
        }

        function prepareFile(file, modulename) {
            var content = '',
                i,
                lastIndex = 0,
                filename = '';

            if (!grunt.file.exists(file)) {
                ringHelper.log('error', 'File', file, ' Not Found');
                return false;
            }
            content = grunt.file.read(file, { encoding: 'utf8' });
            lastIndex = file.lastIndexOf('/');
            if (lastIndex === -1) {
                filename = file;
            } else {
                filename = file.substr(lastIndex + 1);
            }

            // remove debug if necessary
            if (!options.debugEnabled) {
                content = removeDebugCode(content);
            }

            // update settings
            if (filename === options.settingsFile) {
                ringHelper.log('success', 'Update Settings', file, filename);
                content = updateSettings(content);
            }
            // update protocol
            if (filename.indexOf(options.protocolFixFiles) > -1) {
                ringHelper.log('success', 'Update Protocol', file, filename);
                content = updateSettings(content, true);
            }

            // templateURL replace
            for (i = 0; i < options.templateReplaceFiles.length; i++) {
                if (options.templateReplaceFiles[i].indexOf(filename) > -1) {
                    ringHelper.log('success', 'TemplateURL replace', filename);
                    content = replaceTemplateUrl(content);
                }
            }

            SCRIPT_FILES.push({
                name: modulename + '-' + filename,
                content: content,
            });

            return true;
        }


        function replaceTemplateUrl(content) {
            var modifiedContent = String(content),
                templateRegex = /templateUrl[\s]*?:[\s]*?'([\w\W]+?)'/g;

            if (templateRegex.test(modifiedContent)) {
                modifiedContent = modifiedContent.replace(templateRegex, function regexReplace(match, path) {
                    var templatePath = options.publicPath + '/' + path,
                        templateContent,

                        returnVal;

                    if (grunt.file.exists(templatePath)) {
                        templateContent = grunt.file.read(templatePath, { encoding: 'utf8' });
                        returnVal = 'template: \'' + escapeStringAndNewline(templateContent.toString()) + '\'';
                        ringHelper.log('success', 'Replace', match, templatePath);
                    } else {
                        returnVal = match;
                        ringHelper.log('warning', 'Replace', templatePath, 'Not Found');
                    }

                    return returnVal;
                });
            }

            function escapeStringAndNewline(str) {
                var escapedStr;
                /* eslint-disable quotes */
                escapedStr = str.replace(/\\/g, '\\\\')
                         .replace(/'/g, "\\'");
                /* eslint-enable quotes */
                escapedStr = escapedStr.replace(/(?:\r\n|\r|\n)/g, '\' + \n \'');
                return escapedStr;
            }


            return modifiedContent;
        }

        function removeDebugCode(content) {
            var updatedContent = '',
                debugRegex = /DIGEST_DEBUG_START([\s\S]*?)(DIGEST_DEBUG_END)/gm,
                ringloggerRegex = /RingLogger([\s\S]*?;)/g;

            updatedContent = String(content).replace(debugRegex, '');
            updatedContent = updatedContent.replace(ringloggerRegex, '');

            return updatedContent;
        }

        function updateSettings(content, protocolOnly) {
            var i,
                updatedContent = String(content),
                // searches = [/(apiVersion\s*:\s*[0-9]+)/g],
                // replaces = ['apiVersion:' + options.apiVersion],
                searches = [],
                replaces = [],
                protocolSearches,
                protocolReplaces;

            ringHelper.log('taskstart', 'Update Settings');

            if (options.target === 'live') {
            // set replacement parameters
                protocolSearches = (options.protocol === 'ssl') ? [/http:\/\/dev|http:\/\//g, /ws:\/\//g] : [/https:\/\/dev|https:\/\//g, /wss:\/\//g];
                protocolReplaces = (options.protocol === 'ssl') ? ['https://', 'wss://'] : ['http://', 'ws://'];
            } else {
            // set replacement parameters
                protocolSearches = (options.protocol === 'ssl') ? [/http:\/\//g, /ws:\/\//g] : [/https:\/\//g, /wss:\/\//g];
                protocolReplaces = (options.protocol === 'ssl') ? ['https://', 'wss://'] : ['http://', 'ws://'];
            }


            searches = searches.concat(protocolSearches);
            replaces = replaces.concat(protocolReplaces);


            if (!protocolOnly) {
                searches = searches.concat([/(apiVersion\s*:\s*[0-9]+)/g]);
                replaces = replaces.concat(['apiVersion:' + options.apiVersion]);

                searches = searches.concat([/secure\s*:\s*\w+,/]);
                replaces = replaces.concat(options.protocol === 'ssl' ? ['secure:true,'] : ['secure:false,']);

                searches = searches.concat([/analytics\s*:\s*\w+,/, /debugEnabled\s*:\s*\w+,/]);
                replaces = replaces.concat(options.target === 'live' ? ['analytics:true,', 'debugEnabled:false,'] : ['analytics:false,', 'debugEnabled:true,']);
            }

            for (i = 0; i < searches.length; i++) {
                ringHelper.log('info', 'Replace', searches[i], replaces[i]);
                updatedContent = updatedContent.replace(searches[i], replaces[i]);
            }

            ringHelper.log('taskend', 'DONE Update Settings');
            return updatedContent;
        }

        function getFiles(dir, list, extension, nonRecursive) {
            var files,
                name,
                i,
                fileList = list || [];

            // ringHelper.log('info', 'getFiles', dir, extension);
            files = fs.readdirSync(dir);
            for (i in files) {
                if (!files.hasOwnProperty(i)) continue;
                name = dir + '/' + files[i];
                if (fs.statSync(name).isDirectory()) {
                    if (!nonRecursive) {
                        getFiles(name, fileList, extension);
                    }
                } else {
                    // ringHelper.log('info', 'template: ', name);
                    if (extension) {
                        // ringHelper.log('info', 'extension index: ' + name.indexOf(extension),
                        //     'should be: ' + (name.length - extension.length));

                        if (name.indexOf(extension) === (name.length - extension.length)) {
                            fileList.push(name);
                        } else {
                            ringHelper.log('info', 'extension mismatch', name, extension);
                        }
                    } else {
                        fileList.push(name);
                    }
                }
            }
            return fileList;
        }

        // Merge task-specific and/or target-specific options with these defaults.
      //   var options = this.options({
      //     punctuation: '.',
      //     separator: ', '
      //   });

      //   // Iterate over all specified file groups.
      //   this.files.forEach(function(f) {
      //     // Concat specified files.
      //     var src = f.src.filter(function(filepath) {
      //       // Warn on and remove invalid source files (if nonull was set).
      //       if (!grunt.file.exists(filepath)) {
      //         grunt.log.warn('Source file "' + filepath + '" not found.');
      //         return false;
      //       } else {
      //         return true;
      //       }
      //     }).map(function(filepath) {
      //       // Read file source.
      //       return grunt.file.read(filepath);
      //     }).join(grunt.util.normalizelf(options.separator));

      //     // Handle options.
      //     src += options.punctuation;

      //     // Write the destination file.
      //     grunt.file.write(f.dest, src);

      //     // Print a success message.
      //     grunt.log.writeln('File "' + f.dest + '" created.');
      //   });
      // });
    }
}
