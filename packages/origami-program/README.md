# @fuxingloh/origami-program

Compile `*.origami.ts` files into a program to run on the Origami Runtime.
The runtime is a small subset of the NodeJS engine (typescript/javascript)
which enables secure execution of your Origami function in a performant environment.

> Currently, the program is packaged and compiled to run on Deno, but this might change in the future.
> This information is purposely omitted from the user to allow for easy migration in the future.
> We're also exploring other runtime like https://github.com/awslabs/llrt
> Or changing it entirely to run on WebAssembly.

Under the hood this package:

1. parses the code and extracts the subscriptions
2. bundle into an executable program for Origami Runtime
3. minify and strip off any unwanted or unnecessary imports

While it also attempts to catch and warn users of unsupported patterns.
You should use `@fuxingloh/origami-eslint-plugin` to catch unsupported patterns in your program.
