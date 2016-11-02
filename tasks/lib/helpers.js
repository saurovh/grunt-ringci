
var
    Eslint = require('eslint'),
    htmlmin = require('html-minifier').minify,
    Chalk = require('chalk'),
    Util = require('util'),
    Uglifyjs = require('uglify-js');


module.exports.init = initFunc;

function initFunc(grunt) {
    var exports = {};

    exports.log = log;
    exports.lintScript = lintScript;
    exports.minifyHtml = minifyHtml;

    exports.uglify = uglifyScript;
    exports.linkFiles = linkFiles;


    function linkFiles(content, files, startTag, endTag, template) {
        var i,
            scripts = [],
            padding,
            modifiedContent = String(content),
            ind,
            start = content.indexOf(startTag),
            end = content.indexOf(endTag, start);

        // log('info', 'linkFiles', 'content length ', content.length);
        log('info', 'linkFiles', 'no of files ', files.length);
        // log('info', 'linkFiles', 'startTag', startTag);
        // log('info', 'linkFiles', 'endartTag', endTag);
        // log('info', 'linkFiles', 'template', template);
        // log('info', 'linkFiles', 'start', start);
        // log('info', 'linkFiles', 'end', end);

        for (i = 0; i < files.length; i++) {
            scripts.push(Util.format(template, files[i]));
        }

        // grunt.log.write(scripts);

        if (start === -1 || end === -1 || start >= end) {
            return false;
        }

        padding = '';
        ind = start - 1;

        while (/[^\S\n]/.test(content.charAt(ind))) {
            padding += content.charAt(ind);
            ind -= 1;
        }

        modifiedContent = modifiedContent.substr(0, start + startTag.length) +
            grunt.util.linefeed + padding + scripts.join(grunt.util.linefeed + padding) +
            grunt.util.linefeed + padding + modifiedContent.substr(end);

        // Insert the scripts
        // grunt.file.write(dest, newPage);
        // grunt.log.writeln('File "' + dest + '" updated.');

        return modifiedContent;
    }


    function uglifyScript(srcPath, destPath, returnMinified) {
        var uglifyOptions = {
                banner: '/*! @copywrite Ringid.com  %s */\n',
                footer: '',
                compress: {
                    hoist_funs: false,
                    hoist_vars: false,
                    drop_console: true,
                },
                mangle: {},
                beautify: false,
                report: 'min',
                expression: false,
                maxLineLen: 32000,
                ASCIIOnly: false,
                screwIE8: true,
                quoteStyle: 0,
            },
            result,
            output,
            src,
            dest,
            err;

        src = srcPath; // exports.unixifyPath(srcPath);
        dest = destPath; // exports.unixifyPath(destPath);

        try {
            result = Uglifyjs.minify(src, uglifyOptions);
        } catch (e) {
            err = new Error('Uglification failed.');
            if (e.message) {
                err.message += '\n' + e.message + '. \n';
                if (e.line) {
                    err.message += 'Line ' + e.line + ' in ' + src + '\n';
                }
            }
            err.origError = e;
            log('error', 'Uglify', src);
            return false;
        }

        output = Util.format(uglifyOptions.banner, grunt.template.today('yyyy-mm-dd')) + result.code;

        log('success', 'Uglify', src, dest);

        if (returnMinified) {
            return String(output);
        }
        grunt.file.write(dest, output);
        return true;
    }


    function minifyHtml(content) {
        var modifiedContent = String(content),
            options = {
                minifyCSS: false,
                minifyJS: false,
                removeComments: true,
                collapseWhitespace: true,
            };

        try {
            modifiedContent = htmlmin(modifiedContent, options);
        } catch (err) {
            grunt.warn(err);
            return false;
        }

        return modifiedContent;
    }


    function lintScript(fileSrc, opts) {
        var engine = new Eslint.CLIEngine(opts),
            results,
            tooManyWarnings,
            formatter = Eslint.CLIEngine.getFormatter(opts.format),
            report;

        if (!formatter) {
            log('error', 'Linting', 'Could not find formtter:', opts.format);
            return false;
        }


        try {
            report = engine.executeOnFiles([fileSrc]);
        } catch (err) {
            log('warning', 'Lint', err);
            return false;
        }

        if (opts.fix) {
            Eslint.CLIEngine.outputFixes(report);
        }


        results = report.results;
        grunt.log.write(Chalk.yellow(formatter(results)));

        if (opts.quiet) {
            results = Eslint.CLIEngine.getErrorResults(results);
        }

        tooManyWarnings = opts.maxWarnings >= 0 && report.warningCount > opts.maxWarnings;

        if (report.errorCount === 0 && tooManyWarnings) {
            log('error', 'Linting ', fileSrc, ' Too many warning > ' + opts.maxWarnings);
        }

        return report.errorCount === 0;
    }

    function log(type, task, input, output) {
        switch (type) {
            case 'success':
                grunt.log.writeln(Chalk.bold.cyan(task) + ' ' + Chalk.blue(input) + (output ? ' > ' + Chalk.green(output) : ''));
                break;
            case 'warning':
                grunt.log.writeln(Chalk.bold.cyan(task) + ' ' + Chalk.bold.red(input) + (output ? ' > ' + Chalk.yellow(output) : ''));
                break;
            case 'error':
                grunt.fail.fatal(Chalk.bold.cyan(task) + ' ' + Chalk.bold.red(input) + (output ? ' > ' + Chalk.yellow(output) : ''));
                break;
            case 'info':
                grunt.log.writeln(Chalk.underline.magenta(task) + ' ' + Chalk.blue(input) + (output ? ' > ' + Chalk.green(output) : ''));
                break;
            case 'taskstart':
                grunt.log.writeln();
                grunt.log.writeln('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%  ' + Chalk.bold.red(task) + '  %%%%%%%%%%%%%%%%%%%');
                break;
            case 'taskend':
                grunt.log.writeln('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%  ' + Chalk.bold.green(task) + '  %%%%%%%%%%%%%%%%%%%');
                break;
            default:
                grunt.log.writeln(Chalk.bold.cyan(task) + ' ' + Chalk.blue(input) + (output ? ' > ' + Chalk.green(output) : ''));
        }
    }

    return exports;
}
