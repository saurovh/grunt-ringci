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
        var jsPath = '',
            cssPath = '',
           // VENDOR_SCRIPTS = [],
            SCRIPT_FILES = [],
            linkScripts = [],
            // STYLE_SHEETS = [],
            // srcFiles = [],
    // Merge task-specific and/or target-specific options with these defaults.
            options = this.options({
                // punctuation: '.',
                // separator: ', ',
                // target: 'dev',
                // protocol: 'nonssl',
                // apiversion: '145',
                // branch: 'master',
            }),
            fs = require('fs'),
            Crypto = require('crypto'),
            Path = require('path'),
            ringHelper = require('./lib/helpers').init(grunt, options);

        jsPath = options.minifyScripts === true ? '/js/' : '/js/build/';
        cssPath = options.minifyStyles === true ? '/css/styles.min.css' : '/css/styles.css';


        ringHelper.log('info', 'TARGET: ', options.target);
        // main tasks 4 sets of files to watch for
        // 1. minify partial templates
        prepareHtml();
        // 2. prepare js files
            // copy files, run operations(remove debug code, update settings, minify), write to js directory
        prepareJS();
        prepareVendorScripts();
        // 3. prepare css files
        // // run sass and write to css directory
        // prepareCss();
        // 4. prepare root template files and link if necessary
        prepareRootTemplates();
        // // link css and js files and then write to public directory
        // 5. worker files
        // // importscript replace with file content and minify and write to js/worker directory
        prepareWorkerFiles();
        // for chat workers, copy and minify if necessary
        prepareChatWorkers();



        function prepareVendorScripts() {
            var vendorMinFile = options.publicPath + '/js/' + Crypto.createHash('md5').update('app-vendor.min.js' + new Date().getTime()).digest('hex') + '.js',
                uglifiedContent,
                srcPath = '',
                minSrcPath = '',
                minifiedScript = '',
                i;
                // err;

            ringHelper.log('taskstart', 'BUILDING app.vendor.min');

            for (i = 0; i < options.vendorFiles.length; i++) {
                srcPath = options.srcPath + '/' + options.vendorFiles[i];
                if (grunt.file.exists(srcPath)) {
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
                    ringHelper.log('error', 'File', srcPath, 'Not found');
                    return false;
                }
            }

            grunt.file.write(vendorMinFile, minifiedScript);
            linkScripts = [vendorMinFile.replace(options.publicPath, '')].concat(linkScripts);
            // VENDOR_SCRIPTS = [vendorMinFile];

            ringHelper.log('success', 'Uglify', vendorMinFile);

            ringHelper.log('taskend', 'END BUILDING app.vendor.min');
            return true;
        }


        function prepareChatWorkers() {
            var files = [],
                filename,
                src,
                dest,
                j,
                i;
            for (i = 0; i < options.chatWorkers.length; i++) {
                src = options.srcPath + '/' + options.chatWorkers[i].src;
                dest = options.publicPath + '/' + options.chatWorkers[i].dest;

                ringHelper.log('info', 'chatWorker', src, dest);
                files = getFiles(src, [], 'js', true);
                for (j = 0; j < files.length; j++) {
                    filename = files[j].substr(files[j].lastIndexOf('/') + 1);
                    ringHelper.log('info', 'workerFile: ', files[j], dest + '/' + filename);

                    if (options.minifyScripts) {
                        ringHelper.uglify(files[j], dest + '/' + filename);
                    } else {
                        grunt.file.copy(files[j], dest + '/' + filename);
                    }
                }
            }
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
                                if (options.minifyScripts === true || options.target === 'live') {
                                    ringHelper.log('success', 'Included File', Path.resolve((srcPath + srcFile)));
                                    // insert all supportFiles inside worker file content;
                                    workerFileContent += String(grunt.file.read(Path.resolve(srcPath + srcFile), { encoding: 'utf8' })) + '\n';
                                    mainWorker = mainWorker.replace(regexMatches[j], '');
                                } else {
                                    ringHelper.log('info', 'Copy', Path.resolve((srcPath + srcFile)), Path.resolve(dest + srcFile));
                                    grunt.file.copy(Path.resolve(srcPath + srcFile), Path.resolve(dest + srcFile));
                                }
                            } else {
                                ringHelper.log('error', 'File', Path.resolve(srcPath + srcFile), ' Not Found');
                                return false;
                            }
                        }

                        if (options.minifyScripts === true || options.target === 'live') {
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

            // minify and copy
            // for dashboard and index.html link html and css files
            for (i = 0; i < files.length; i++) {
                // ringHelper.log('info', 'rootTemplate', files[i]);
                content = grunt.file.read(files[i], { encoding: 'utf8' });
                temp = files[i].replace(options.srcPath + '/', '');
                if (temp === 'index.html' || temp === 'dashboard.html') {
                    ringHelper.log('info', 'link script and css', files[i]);
                    minifiedContent = linkHtmlCss(content);
                } else {
                    minifiedContent = ringHelper.minifyHtml(content);
                }

                if (!minifiedContent) {
                    ringHelper.log('error', 'rootTemplate', files[i], 'Failed');
                }
                grunt.file.write(files[i].replace(options.srcPath, options.publicPath), minifiedContent);
            }
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
                '<script  src=\'%s\'></script>');
            // link styles
            modifiedContent = ringHelper.linkFiles(
                modifiedContent,
                [cssPath],
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

            files = getFiles(templateDir, [], 'html');

            for (i = 0; i < files.length; i++) {
                templateContent = grunt.file.read(files[i], { encoding: 'utf8' });
                if (templateContent) {
                    minifiedContent = ringHelper.minifyHtml(templateContent);
                    if (!minifiedContent) {
                        minifiedContent = templateContent;
                        ringHelper.log('warning', 'Htmlmin', files[i], 'FAIL: ' + templateContent.length);
                    }

                    destination = files[i].replace(templateDir, options.publicPath + '/templates');

                    // ringHelper.log('info', 'templateName: ', files[i], destination);
                    grunt.file.write(destination, minifiedContent);
                } else {
                    ringHelper.log('warning', 'Htmlmin', files[i], 'empty file');
                }
            }
        }

        function prepareJS() {
            // copy files DONE
            // check if eslint s needed or not DONE
            // remove debug code DONE
            // update settings DONE
            // minify if necessary DONE
            // write to destination DONE
            var i,
                appScriptContent = '',
                minifiedScriptFile = Crypto.createHash('md5').update('app.min.js' + new Date().getTime()).digest('hex') + '.js',
                path;


            copyJSFiles();

            if (options.minifyScripts) {
                // concat script files
                for (i = 0; i < SCRIPT_FILES.length; i++) {
                    appScriptContent += SCRIPT_FILES[i].content + '\n';
                    // path = options.publicPath + jsPath + SCRIPT_FILES[i].name;
                    // ringHelper.log('info', 'write script to ', path);
                    // grunt.file.write(path, SCRIPT_FILES[i].content);
                }
                // write script file
                grunt.file.write(options.publicPath + jsPath + 'app.js', appScriptContent);
                ringHelper.uglify(options.publicPath + jsPath + 'app.js', options.publicPath + jsPath + minifiedScriptFile);
                linkScripts.push(jsPath + minifiedScriptFile);
            } else {
                // write script files
                for (i = 0; i < SCRIPT_FILES.length; i++) {
                    path = options.publicPath + jsPath + SCRIPT_FILES[i].name;
                    grunt.file.write(path, SCRIPT_FILES[i].content);
                    linkScripts.push(path.replace(options.publicPath, ''));
                }
            }
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
                    // grunt.log.writeln(moduleContent);
                    // if (options.buildModules) {
                    // moduleContent = moduleContentStart + moduleContentEnd + moduleContent;
                    // } else {
                    moduleContent = moduleContentStart + moduleContent + moduleContentEnd;
                    // }
                    //

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


            return true;
        }

        function prepareFile(file, modulename) {
            var content = '',
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
                content = updateSettings(content);
            }

            // templateURL replace
            if (options.templateReplaceFiles.indexOf(filename) > -1) {
                content = replaceTemplateUrl(content);
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

        function updateSettings(content) {
            var i,
                updatedContent = String(content),
                searches = [/(apiVersion\s*:\s*[0-9]+)/g],
                replaces = ['apiVersion:' + options.apiVersion],
                protocolSearches,
                protocolReplaces;

            ringHelper.log('taskstart', 'UPDATE APIVERSION, PROTOCOL, SETTINGS(ANALYTICS,DEBUGENABLED,SECURE');

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

            searches = searches.concat([/secure\s*:\s*\w+,/]);
            replaces = replaces.concat(options.protocol === 'ssl' ? ['secure:true,'] : ['secure:false,']);

            searches = searches.concat([/analytics\s*:\s*\w+,/, /debugEnabled\s*:\s*\w+,/]);
            replaces = replaces.concat(options.target === 'live' ? ['analytics:true,', 'debugEnabled:false,'] : ['analytics:false,', 'debugEnabled:true,']);

            for (i = 0; i < searches.length; i++) {
                updatedContent = updatedContent.replace(searches[i], replaces[i]);
            }
            // Modify settingsFile
            // ringHelper.replace(options.settingsFile, searches, replaces);
            // Modify Template files
            // ringHelper.replace(options.protocolFixTemplates, protocolSearches[0], protocolReplaces[0], false, true);
            // MOdify Worker Files
            // ringHelper.replace(options.protocolFixScripts, protocolSearches[1], protocolReplaces[1]);

            ringHelper.log('taskend', 'END UPDATE APIVERSION, PROTOCOL, SETTINGS(ANALYTICS,DEBUGENABLED,SECURE');
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
