import processMiddleware from '../src/condcomments'
import { class_Uri } from 'atma-utils';


UTest({
    'should remove comment'() {
        let content = `
            /*#if (DEBUG)
            var foo = 1;
             */
            var bar = 2;
        `;

        let result = runMiddleware(content, { RELEASE: true });
        hasNot_(result.content, 'foo');
        has_(result.content, 'bar');

        result = runMiddleware(content, { DEBUG: true });

        let code = result.content.replace(/\s/g, '');
        eq_(code, 'varfoo=1;varbar=2;');
    },
    'should modify if condition comment in uncommented block': {
        'one line' () {
            let content = `
                //#if (NODE)
                var foo = 1;
                //#endif
            `;
            let result = runMiddleware(content, { NODE: true });
            hasNot_(result.content, '//#if');
            has_(result.content, 'foo');
            has_(result.content, '//!if');
        },
        'multiline' () {
            let result = runMiddleware(`
                /*#if (target == "prod") */
                var prod = true;
                /*#endif */
            `, { target: 'prod' });
            hasNot_(result.content, '/*#if');
            has_(result.content, 'prod');
            has_(result.content, '/*!if');
        }

    }
})


function runMiddleware(content: string, options: any) {
    let uri = new class_Uri('some.js')
    let result = processMiddleware(content, { uri }, {
        getOption: () => options
    });
    return result;
}
