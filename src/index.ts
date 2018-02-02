import * as Base from 'atma-io-middleware-base'
import process from './condcomments'

export = Base.create({
    name: 'atma-io-middleware-condcomments',
    textOnly: true,
    defaultOptions: {
        
    },
    process
});