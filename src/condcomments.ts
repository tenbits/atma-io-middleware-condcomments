import { Compiler } from 'atma-io-middleware-base'

declare let app;

/**
 *  Handler can accept as file content - JavaScript String or UglifJS AST Tree
 */

export default function processMiddleware(content: string, file, compiler: Pick<Compiler, 'getOption'>) {
    let defines = [
        compiler.getOption('defines'),
        compiler.getOption('varDefs'),
        process.env,
        null,
        null
    ];
    if (typeof app !== 'undefined') {
        defines[2] = app.config?.defines ?? null;
        defines[3] = app.current?.defines ?? null;
    }
    let handler = HANDLERS.find(x => x.supports(file));
    return {
        content: processContent(content, 0, defines, handler),
        sourceMap: null
    };
}

function processContent(code: string, index: number, defines: any[], handler?: CommentBlockHandler) {

    if (handler == null) {
        return code;
    }

    let match = handler.next(code, index);
    if (match == null) {
        return code;
    }

    const doAction = Executor.exec(match.expression, defines);
    const status = handler.getStatus(code, match);
    switch (true) {
        case (status === 'commented' && doAction === true) : {
            [code, index] = handler.uncomment(code, match);
            break;
        }
        case (status === 'commented' && doAction === false) : {
            [code, index] = handler.removeComment(code, match);
            break;
        }
        case (status === 'uncommented' && doAction === false): {
            [code, index] = handler.comment(code, match);
            break;
        }
        case (status === 'uncommented' && doAction === true): {
            // replace comment with hashbang to prevent further processing
            [code, index] = handler.replaceComment(code, match);
            break;
        }
        default: {
            index = match.match.index + 1;
            break;
        }
    }

    return processContent(code, index, defines, handler);
}


namespace Executor {

    export function exec (expression: string, defines: any[]) {

        let wrapped = expression.replace(/\b(\w[\w_$]+)\b(?!['"])/g, (full, accessor) => {
            switch (accessor) {
                case 'true':
                case 'false':
                    return full;
            }

            return `get('${accessor}')`;
        });
        function getter (param) {
            for (let i = 0; i < defines.length; i++) {
                if (defines[i] == null) {
                    continue;
                }
                let x = defines[i][param];
                if (x != null) {
                    return x;
                }
            }
            return null;
        }

        try {
            const fn = new Function('expression', 'get', 'return ' + wrapped);
            const result = fn(expression, param => {
                return getter(param);
            });
            return !!result;

        } catch (error) {
            throw new Error (`Conditional directive ${expression}: ${error}`);
        }
    };
}

interface ICommentBlockData {
    supports(file): boolean

    reg_commentEnd: RegExp
    reg_oneLineComment: RegExp
    reg_IF_Comment: RegExp
    reg_IF_Expression_Index: number[]
    reg_ENDIF_Comment: RegExp
}

class CommentBlockHandler {
    supports: (file: any) => boolean;

    constructor (data: ICommentBlockData) {
        this.reg_commentEnd = data.reg_commentEnd;
        this.reg_oneLineComment = data.reg_oneLineComment;
        this.reg_IF_Comment = data.reg_IF_Comment;
        this.reg_IF_Expression_Index = data.reg_IF_Expression_Index;
        this.reg_ENDIF_Comment = data.reg_ENDIF_Comment;
        this.supports = data.supports;
    }

    reg_commentEnd: RegExp
    reg_oneLineComment: RegExp
    reg_IF_Comment: RegExp
    reg_IF_Expression_Index: number[]
    reg_ENDIF_Comment: RegExp


    next (code: string, index: number): CommentExpressionMatch | null {
        this.reg_IF_Comment.lastIndex = index;

        let match = this.reg_IF_Comment.exec(code);
        if (match == null) {
            return null;
        }
        let idxs = this.reg_IF_Expression_Index;
        let idx = idxs.find(x => Boolean(match[x]));
        return {
            expression: match[idx!],
            match: match
        };
    }

    getStatus (code: string, expressionMatch: CommentExpressionMatch): BlockStatus {
        let currentMatch = expressionMatch.match;

        this.reg_oneLineComment.lastIndex = currentMatch.index;
        let endMatch = this.reg_oneLineComment.exec(code);
        if (endMatch != null && endMatch.index === currentMatch.index) {
            return 'uncommented';
        }
        return 'commented';
    }

    uncomment(code: string, expressionMatch: CommentExpressionMatch): [string, number] {
        let currentMatch = expressionMatch.match;
        let currentEndIndex = currentMatch.index + currentMatch[0].length;

        this.reg_commentEnd.lastIndex = currentEndIndex;

        let match = this.reg_commentEnd.exec(code) as RegExpExecArray;
        let end = match.index + match[0].length;
        let value = code.substring(0, currentMatch.index)
                + code.substring(currentEndIndex, match.index)
                + code.substring(end)
                ;

        let index = currentMatch.index + (match.index - currentEndIndex);
        return [value, index];
    }

    comment(code: string, expressionMatch: CommentExpressionMatch): [string, number] {
        let currentMatch = expressionMatch.match;
        let currentEndIndex = currentMatch.index + currentMatch[0].length;

        this.reg_ENDIF_Comment.lastIndex = currentEndIndex;
        let match = this.reg_ENDIF_Comment.exec(code) as RegExpExecArray;

        let value = code.substring(0, currentMatch.index)
            + code.substring(match.index + match[0].length);

        let index = currentMatch.index;
        return [value, index];
    }

    removeComment(code: string, expressionMatch: CommentExpressionMatch): [string, number] {
        let currentMatch = expressionMatch.match;
        let currentEndIndex = currentMatch.index + currentMatch[0].length;

        this.reg_commentEnd.lastIndex = currentEndIndex;

        let match = this.reg_commentEnd.exec(code) as RegExpExecArray;
        let end = match.index + match[0].length;
        let value = code.substring(0, currentMatch.index) + code.substring(end);

        let index = currentMatch.index + 1;
        return [value, index];
    }

    replaceComment(code: string, expressionMatch: CommentExpressionMatch): [string, number] {
        let currentMatch = expressionMatch.match;


        let str = currentMatch[0];
        let end = currentMatch.index + str.length;

        str = str.replace('#if', '!if');

        let value = code.substring(0, currentMatch.index)
            + str
            + code.substring(end);

        let index = currentMatch.index + 1;
        return [value, end];
    }
}

interface CommentExpressionMatch {
    expression: string
    match: RegExpExecArray
};


const HANDLERS = [
    new CommentBlockHandler({
        reg_commentEnd: /-->/g,
        reg_oneLineComment: /^[ \t]*<!--[ \t]*#if[^\n\r]+-->/gm,
        reg_IF_Expression_Index: [1],
        reg_IF_Comment: /^[ \t]*<!--[ \t]*#if[ \t]*(([^\s]+$)|(\([^)\n\r]+\)))/gm,
        reg_ENDIF_Comment: /^[ \t]*<!--[ \t]*#endif[\s]*-->/gm,
        supports (file) {
            return file.uri.extension.includes('html');
        }
    }),
    new CommentBlockHandler({
        reg_commentEnd: /\*\//g,
        reg_oneLineComment: /^[ \t]*((\/\/[^\r\n]+)|(\/\*[^\n\r]+\*\/))[ \t]*$/gm,
        reg_IF_Comment: /^[ \t]*((\/\/)|(\/\*+))[ \t]*#if[ \t]*(([^\s]+$)|(\([^)\n\r]+\)))/gm,
        reg_IF_Expression_Index: [ 4 ],

        reg_ENDIF_Comment: /(\/\*[\t ]*#endif[\t ]*\*\/)|([ \t]*\/\/[ \t]*#endif[ \t]*$)/gm,
        supports () {
            return true;
        }
    })
];

type BlockStatus = 'commented' | 'uncommented';
