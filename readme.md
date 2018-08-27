Conditional comments file middleware for Atma.IO and Atma.Toolkit. Supports JavaScript and HTML comments.
-----

The Plugin provides a custom middleware to exclude/include conditional comments:
- [`atma-io`](https://github.com/atmajs/atma-io) 
- [`Atma Toolkit`](https://github.com/atmajs/Atma.Toolkit) 
- [`App Bundler`](https://github.com/atmajs/app-bundler) 


##### How to use

###### Extend files

There are 2 strategies: **to comment** and **to uncomment**. You should use  `to comment` strategy for default block, so that a file is valid even without a condcomment middleware.

- Uncomment on TRUE expressions

    ```js
    /*#if (EXPRESSION)
        content body
    */
    ```
- Comment on FALSE expressions

    ```js
    //#if (EXPRESSION)
    content body
    //#endif
    ```

###### Expressions

Expressions are usual javascript expressions. The values for variables are taken from a) ENV and b) process argv c) middleware settings.

###### Embed into the project

+ **Atma Toolkit** 

    ```bash
    $ atma plugin install atma-io-middleware-condcomments --save-dev
    ```

	This adds `atma-io-middleware-condcomments` npm dependency and the `package.json` would look like:
    ```json
        {
            "devDependencies": {
                "atma-io-middleware-condcomments"
            },
            "atma": {
                "plugins": [
                    "atma-io-middleware-condcomments"
                ],
                "settings": {
					"atma-io-middleware-condcomments": {
                        "defines": {
                            "DEBUG": true
                        }
                    },
                    "io": {
                        "extensions": {
                            "ts": [
                                "atma-io-middleware-condcomments:read",
                                "atma-loader-ts:read"
                            ]
                        }
                    }

                }
            }
        }
    ```
+ **App Bundler** 
    
    ```bash
    $ npm i atma-io-middleware-condcomments --save-dev
    ```

    Extend AppBundler config with IO settings, for example in `package.json` for typescript extensions.
    ```javascript
    {
        /* ... any package json settings */
        "app-bundler": {
            /* ... any app-bundler settings */
            "middlewares": {                
                "ts": [
                    "atma-io-middleware-condcomments:read",
                    "atma-loader-ts:read"
                ]
            }
        },
    }
    ```

+ Run

    + **Atma Toolkit**  Dev Server
        ```bash
        $ atma server
        ```

    + **App Bundler**  Just run app bundler commands as usual
        
----
The MIT License