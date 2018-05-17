import { Compiler } from 'atma-io-middleware-base'

/**
 *  Handler can accept as file content - JavaScript String or UglifJS AST Tree
 */

export default function processMiddleware(content: string, file, compiler: Compiler) {
	let defines = [
		compiler.getOption('defines'),
		compiler.getOption('varDefs'),
	];
	return {
		content: processContent(content, 0, defines),
		sourceMap: null
	};
}

function processContent(code: string, index: number, defines: any[]) {

	CommentBlock.reg_expression.lastIndex = index || 0;

	let match = CommentBlock.reg_expression.exec(code);
	if (match == null) {
		return code;
	}

	const doAction = Executor.exec(match[4], defines);
	const status = CommentBlock.getStatus(code, match);

	switch (true) {
		case (status === 'commented' && doAction === true) : {		
			[code, index] = CommentBlock.uncomment(code, match);	
			break;
		}
		case (status === 'uncommented' && doAction === false): {
			[code, index] = CommentBlock.comment(code, match);
			break;
		}
		default: {
			index = match.index + 1;
			break;
		}
	}

	return processContent(code, index, defines);
}


namespace Executor {
	
	let appcfg = require('appcfg').fetch();

	export function exec (expression: string, defines: any[]) {
		
		let wrapped = expression.replace(/($|[^\.'"`\]]\s*)(\w[\w_$]+)/g, (full, prfx, accessor) => {
			switch (accessor) {
				case 'true':
				case 'false':
					return full;
			}

			return `${prfx}get('${accessor}')`;
		});
		function getter (param) {
			let x = appcfg.$get(param);
			if (x != null) {
				return x;
			}
			for (let i = 0; i < defines.length; i++) {
				if (defines[i] == null) {
					continue;
				}
				x = defines[i][param];
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
			throw new Error (`Conditional derective ${expression}: ${error}`);
		}
	};
}

namespace CommentBlock {
	
	export const reg_commentEnd = /\*\//g;
	export const reg_inlineEnd = /\/\*[ \t]*#if[^\n\r]+\*\//g;
	export const reg_endIf = /(\/\*[\t ]*#endif[\t ]*\*\/)|([ \t]*\/\/[ \t]*#endif[ \t]*$)/gm;
	export const reg_expression = /^[ \t]*((\/\/)|(\/\*+))[ \t]*#if[ \t]*(([^\s]+$)|(\([^)\n\r]+\)))/gm;

	export type BlockStatus = 'commented' | 'uncommented';

	export function getStatus (code: string, currentMatch: RegExpExecArray): BlockStatus {
		if (currentMatch[1] === '//') {
			// Line Comment found. Means the code block itself is uncommented
			return 'uncommented';
		}

		reg_inlineEnd.lastIndex = currentMatch.index;
		let endMatch = CommentBlock.reg_inlineEnd.exec(code);
		if (endMatch != null && endMatch.index === currentMatch.index) {
			return 'uncommented';
		}
		return 'commented';
	}
		
	export function uncomment(code: string, currentMatch: RegExpExecArray): [string, number] {
		let currentEndIndex = currentMatch.index + currentMatch[0].length;

		reg_commentEnd.lastIndex = currentEndIndex;

		var match = reg_commentEnd.exec(code),
			end = match.index + match[0].length,
			value = code.substring(0, currentMatch.index) 
				+ code.substring(currentEndIndex, match.index) 
				+ code.substring(end)
				;


		let index = currentMatch.index + (match.index - currentEndIndex);
		return [value, index];
	}

	export function comment(code: string, currentMatch: RegExpExecArray): [string, number]{
		let currentEndIndex = currentMatch.index + currentMatch[0].length;

		reg_endIf.lastIndex = currentEndIndex;
		let match = reg_endIf.exec(code);

		let value = code.substring(0, currentMatch.index) 
			+ code.substring(match.index + match[0].length);

		let index = currentMatch.index;
		return [value, index];
	}


}