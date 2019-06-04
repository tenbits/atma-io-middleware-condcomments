import * as Midd from '../index'
import * as io from 'atma-io'


Midd.setOptions({
	defines: {
		TEST: true
	}
});

io.File.registerExtensions({
	"js": [
		[ Midd, 'read']
	], 	
});

UTest({
	'should remove uncommented block and uncomment the commented one' () {
		let content = io.File.read('/test/fixtures/foo.js');
		eq_(
			content.trim(), 
			'commented',
			`commented block should be now uncommented add has only one word: 'commented'`);
    }    
})
