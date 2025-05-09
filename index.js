
// source ./RootModuleWrapped.js
(function(){

    var _src_condcomments = {};

// source ./ModuleSimplified.js
var _src_condcomments;
(function () {
    // ensure AMD is not active for the model, so that any UMD exports as commonjs
    var define = null;
    var exports = _src_condcomments != null ? _src_condcomments : {};
    var module = { exports: exports };

    "use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *  Handler can accept as file content - JavaScript String or UglifJS AST Tree
 */
function processMiddleware(content, file, compiler) {
    var _a, _b, _c, _d;
    var defines = [
        compiler.getOption('defines'),
        compiler.getOption('varDefs'),
        process.env,
        null,
        null
    ];
    if (typeof app !== 'undefined') {
        defines[2] = (_b = (_a = app.config) === null || _a === void 0 ? void 0 : _a.defines) !== null && _b !== void 0 ? _b : null;
        defines[3] = (_d = (_c = app.current) === null || _c === void 0 ? void 0 : _c.defines) !== null && _d !== void 0 ? _d : null;
    }
    var handler = HANDLERS.find(function (x) { return x.supports(file); });
    return {
        content: processContent(content, 0, defines, handler),
        sourceMap: null
    };
}
exports.default = processMiddleware;
function processContent(code, index, defines, handler) {
    var _a, _b, _c, _d;
    if (handler == null) {
        return code;
    }
    var match = handler.next(code, index);
    if (match == null) {
        return code;
    }
    var doAction = Executor.exec(match.expression, defines);
    var status = handler.getStatus(code, match);
    switch (true) {
        case (status === 'commented' && doAction === true): {
            _a = handler.uncomment(code, match), code = _a[0], index = _a[1];
            break;
        }
        case (status === 'commented' && doAction === false): {
            _b = handler.removeComment(code, match), code = _b[0], index = _b[1];
            break;
        }
        case (status === 'uncommented' && doAction === false): {
            _c = handler.comment(code, match), code = _c[0], index = _c[1];
            break;
        }
        case (status === 'uncommented' && doAction === true): {
            // replace comment with hashbang to prevent further processing
            _d = handler.replaceComment(code, match), code = _d[0], index = _d[1];
            break;
        }
        default: {
            index = match.match.index + 1;
            break;
        }
    }
    return processContent(code, index, defines, handler);
}
var Executor;
(function (Executor) {
    function exec(expression, defines) {
        var wrapped = expression.replace(/\b(\w[\w_$]+)\b(?!['"])/g, function (full, accessor) {
            switch (accessor) {
                case 'true':
                case 'false':
                    return full;
            }
            return "get('".concat(accessor, "')");
        });
        function getter(param) {
            for (var i = 0; i < defines.length; i++) {
                if (defines[i] == null) {
                    continue;
                }
                var x = defines[i][param];
                if (x != null) {
                    return x;
                }
            }
            return null;
        }
        try {
            var fn = new Function('expression', 'get', 'return ' + wrapped);
            var result = fn(expression, function (param) {
                return getter(param);
            });
            return !!result;
        }
        catch (error) {
            throw new Error("Conditional directive ".concat(expression, ": ").concat(error));
        }
    }
    Executor.exec = exec;
    ;
})(Executor || (Executor = {}));
var CommentBlockHandler = /** @class */ (function () {
    function CommentBlockHandler(data) {
        this.reg_commentEnd = data.reg_commentEnd;
        this.reg_oneLineComment = data.reg_oneLineComment;
        this.reg_IF_Comment = data.reg_IF_Comment;
        this.reg_IF_Expression_Index = data.reg_IF_Expression_Index;
        this.reg_ENDIF_Comment = data.reg_ENDIF_Comment;
        this.supports = data.supports;
    }
    CommentBlockHandler.prototype.next = function (code, index) {
        this.reg_IF_Comment.lastIndex = index;
        var match = this.reg_IF_Comment.exec(code);
        if (match == null) {
            return null;
        }
        var idxs = this.reg_IF_Expression_Index;
        var idx = idxs.find(function (x) { return Boolean(match[x]); });
        return {
            expression: match[idx],
            match: match
        };
    };
    CommentBlockHandler.prototype.getStatus = function (code, expressionMatch) {
        var currentMatch = expressionMatch.match;
        this.reg_oneLineComment.lastIndex = currentMatch.index;
        var endMatch = this.reg_oneLineComment.exec(code);
        if (endMatch != null && endMatch.index === currentMatch.index) {
            return 'uncommented';
        }
        return 'commented';
    };
    CommentBlockHandler.prototype.uncomment = function (code, expressionMatch) {
        var currentMatch = expressionMatch.match;
        var currentEndIndex = currentMatch.index + currentMatch[0].length;
        this.reg_commentEnd.lastIndex = currentEndIndex;
        var match = this.reg_commentEnd.exec(code);
        var end = match.index + match[0].length;
        var value = code.substring(0, currentMatch.index)
            + code.substring(currentEndIndex, match.index)
            + code.substring(end);
        var index = currentMatch.index + (match.index - currentEndIndex);
        return [value, index];
    };
    CommentBlockHandler.prototype.comment = function (code, expressionMatch) {
        var currentMatch = expressionMatch.match;
        var currentEndIndex = currentMatch.index + currentMatch[0].length;
        this.reg_ENDIF_Comment.lastIndex = currentEndIndex;
        var match = this.reg_ENDIF_Comment.exec(code);
        var value = code.substring(0, currentMatch.index)
            + code.substring(match.index + match[0].length);
        var index = currentMatch.index;
        return [value, index];
    };
    CommentBlockHandler.prototype.removeComment = function (code, expressionMatch) {
        var currentMatch = expressionMatch.match;
        var currentEndIndex = currentMatch.index + currentMatch[0].length;
        this.reg_commentEnd.lastIndex = currentEndIndex;
        var match = this.reg_commentEnd.exec(code);
        var end = match.index + match[0].length;
        var value = code.substring(0, currentMatch.index) + code.substring(end);
        var index = currentMatch.index + 1;
        return [value, index];
    };
    CommentBlockHandler.prototype.replaceComment = function (code, expressionMatch) {
        var currentMatch = expressionMatch.match;
        var str = currentMatch[0];
        var end = currentMatch.index + str.length;
        str = str.replace('#if', '!if');
        var value = code.substring(0, currentMatch.index)
            + str
            + code.substring(end);
        var index = currentMatch.index + 1;
        return [value, end];
    };
    return CommentBlockHandler;
}());
;
var HANDLERS = [
    new CommentBlockHandler({
        reg_commentEnd: /-->/g,
        reg_oneLineComment: /^[ \t]*<!--[ \t]*#if[^\n\r]+-->/gm,
        reg_IF_Expression_Index: [1],
        reg_IF_Comment: /^[ \t]*<!--[ \t]*#if[ \t]*(([^\s]+$)|(\([^)\n\r]+\)))/gm,
        reg_ENDIF_Comment: /^[ \t]*<!--[ \t]*#endif[\s]*-->/gm,
        supports: function (file) {
            return file.uri.extension.includes('html');
        }
    }),
    new CommentBlockHandler({
        reg_commentEnd: /\*\//g,
        reg_oneLineComment: /^[ \t]*((\/\/[^\r\n]+)|(\/\*[^\n\r]+\*\/))[ \t]*$/gm,
        reg_IF_Comment: /^[ \t]*((\/\/)|(\/\*+))[ \t]*#if[ \t]*(([^\s]+$)|(\([^)\n\r]+\)))/gm,
        reg_IF_Expression_Index: [4],
        reg_ENDIF_Comment: /(\/\*[\t ]*#endif[\t ]*\*\/)|([ \t]*\/\/[ \t]*#endif[ \t]*$)/gm,
        supports: function () {
            return true;
        }
    })
];
;

    function __isObj(x) {
        return x != null && typeof x === 'object' && x.constructor === Object;
    }
    if (_src_condcomments === module.exports) {
        // do nothing if
    } else if (__isObj(_src_condcomments) && __isObj(module.exports)) {
        Object.assign(_src_condcomments, module.exports);
    } else {
        _src_condcomments = module.exports;
    }

    ;
}());

// end:source ./ModuleSimplified.js

"use strict";
var Base = require("atma-io-middleware-base");
var condcomments_1 = _src_condcomments;
module.exports = Base.create({
    name: 'atma-io-middleware-condcomments',
    textOnly: true,
    defaultOptions: {
        defines: {}
    },
    process: condcomments_1.default
});


}());

// end:source ./RootModuleWrapped.js
