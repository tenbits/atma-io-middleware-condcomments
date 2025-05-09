import * as Midd from '../index.js'
import { File } from 'atma-io'


Midd.setOptions({
    defines: {
        TEST: true
    }
});

File.registerExtensions({
    "js": [
        [Midd, 'read']
    ],
});

UTest({
    'should remove uncommented block and uncomment the commented one'() {
        let content = File.read<string>('/test/fixtures/foo.js');
        eq_(
            content.trim(),
            'commented',
            `commented block should be now uncommented add has only one word: 'commented'`);
    }
})
