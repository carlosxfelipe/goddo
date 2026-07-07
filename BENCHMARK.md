## Benchmarks

This project includes benchmarks to test the performance of the Goddo framework using Deno's
built-in benchmarking tool.

To run the benchmarks, execute the following command:

```bash
deno bench benchmarks/
```

### Performance Results (JSR Package / Deno 2.9.0 / Apple M1)

| Benchmark                              | Time/iter (avg) | Iter/s  | (min … max)          | p75    | p99     | p995    |
| -------------------------------------- | --------------- | ------- | -------------------- | ------ | ------- | ------- |
| **GET /** (Redirect)                   | 1.7 µs          | 579,000 | ( 1.2 µs … 1.9 ms)   | 1.5 µs | 2.9 µs  | 3.9 µs  |
| **GET /page** (HTML rendering)         | 7.7 µs          | 129,300 | ( 6.4 µs … 498.9 µs) | 7.5 µs | 13.8 µs | 20.5 µs |
| **GET /todos/** (List todos)           | 1.9 µs          | 527,100 | ( 1.8 µs … 2.0 µs)   | 1.9 µs | 2.0 µs  | 2.0 µs  |
| **GET /todos/1** (Get a specific todo) | 2.4 µs          | 419,800 | ( 2.2 µs … 4.9 µs)   | 2.3 µs | 4.9 µs  | 4.9 µs  |
| **POST /todos/** (Create todo)         | 3.4 µs          | 294,000 | ( 3.3 µs … 4.1 µs)   | 3.4 µs | 4.1 µs  | 4.1 µs  |
| **PUT /todos/1** (Update todo)         | 4.0 µs          | 248,300 | ( 3.9 µs … 4.4 µs)   | 4.1 µs | 4.4 µs  | 4.4 µs  |
| **DELETE /todos/2** (Delete todo)      | 1.7 ms          | 603.9   | ( 1.6 ms … 1.8 ms)   | 1.7 ms | 1.8 ms  | 1.8 ms  |

### Performance Results (Local Workspace / Deno 2.9.0 / Apple M1)

| Benchmark                              | Time/iter (avg) | Iter/s  | (min … max)        | p75    | p99     | p995    |
| -------------------------------------- | --------------- | ------- | ------------------ | ------ | ------- | ------- |
| **GET /** (Redirect)                   | 1.8 µs          | 565,900 | ( 1.3 µs … 2.5 ms) | 1.5 µs | 2.5 µs  | 3.3 µs  |
| **GET /page** (HTML rendering)         | 8.6 µs          | 116,700 | ( 7.3 µs … 1.2 ms) | 8.4 µs | 14.3 µs | 19.1 µs |
| **GET /todos/** (List todos)           | 2.0 µs          | 501,800 | ( 1.9 µs … 2.2 µs) | 2.0 µs | 2.2 µs  | 2.2 µs  |
| **GET /todos/1** (Get a specific todo) | 2.3 µs          | 428,000 | ( 2.2 µs … 2.6 µs) | 2.4 µs | 2.6 µs  | 2.6 µs  |
| **POST /todos/** (Create todo)         | 3.4 µs          | 290,000 | ( 3.3 µs … 4.1 µs) | 3.5 µs | 4.1 µs  | 4.1 µs  |
| **PUT /todos/1** (Update todo)         | 4.0 µs          | 247,100 | ( 3.9 µs … 4.5 µs) | 4.1 µs | 4.5 µs  | 4.5 µs  |
| **DELETE /todos/2** (Delete todo)      | 1.7 ms          | 605.8   | ( 1.6 ms … 2.0 ms) | 1.7 ms | 1.7 ms  | 1.9 ms  |

### ElysiaJS Performance Results (Bun 1.1.43 / Apple M1)

For comparison, here is the performance of the exact same API built with
[ElysiaJS](https://elysiajs.com/) running on [Bun](https://bun.sh/) (using mitata):

| Benchmark                              | Time/iter (avg) | (min … max)             | p99       |
| -------------------------------------- | --------------- | ----------------------- | --------- |
| **GET /** (Redirect)                   | 1.03 µs         | (708.00 ns … 625.96 µs) | 4.46 µs   |
| **GET /page** (HTML rendering)         | 6.42 µs         | (4.54 µs … 988.33 µs)   | 22.54 µs  |
| **GET /todos/** (List todos)           | 1.72 µs         | (1.29 µs … 485.33 µs)   | 6.21 µs   |
| **GET /todos/1** (Get a specific todo) | 1.99 µs         | (1.46 µs … 562.79 µs)   | 7.54 µs   |
| **POST /todos/** (Create todo)         | 3.48 µs         | (2.54 µs … 1.04 ms)     | 15.29 µs  |
| **PUT /todos/1** (Update todo)         | 4.11 µs         | (3.17 µs … 617.42 µs)   | 13.38 µs  |
| **DELETE /todos/2** (Delete todo)      | 312.38 µs       | (227.88 µs … 2.78 ms)   | 935.04 µs |
