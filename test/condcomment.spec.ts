import processMiddleware from '../src/condcomments'
import { class_Uri } from 'atma-utils';


UTest({
    'should remove comment' () {
        let content = `
            /*#if (DEBUG)
            var foo = 1;
             */
            var bar = 2;
        `;

        let uri = new class_Uri('some.js')
        let result = processMiddleware(content, { uri }, {
            getOption: () => ({ RELEASE: true })
        });
        hasNot_(result.content, 'foo');
        has_(result.content, 'bar');

        result = processMiddleware(content, { uri }, {
            getOption: () => ({ DEBUG: true })
        });

        let code = result.content.replace(/\s/g, '');
        eq_(code, 'varfoo=1;varbar=2;');
    }
})