## Benchmarks

This project includes benchmarks to test the performance of the Goddo framework using Deno's
built-in benchmarking tool.

To run the benchmarks, execute the following command:

```bash
deno bench benchmarks/
```

### Performance Results (Local Workspace / Deno 2.9.0 / Apple M1)

| Benchmark                              | Time/iter (avg) | Iter/s  | (min … max)          | p75    | p99     | p995    |
| -------------------------------------- | --------------- | ------- | -------------------- | ------ | ------- | ------- |
| **GET /** (Redirect)                   | 1.7 µs          | 589,600 | ( 1.2 µs … 2.2 ms)   | 1.5 µs | 2.3 µs  | 2.9 µs  |
| **GET /page** (HTML rendering)         | 7.8 µs          | 128,000 | ( 6.5 µs … 919.2 µs) | 7.5 µs | 13.8 µs | 18.8 µs |
| **GET /todos/** (List todos)           | 1.9 µs          | 523,300 | ( 1.8 µs … 2.1 µs)   | 1.9 µs | 2.1 µs  | 2.1 µs  |
| **GET /todos/1** (Get a specific todo) | 2.2 µs          | 456,200 | ( 2.1 µs … 2.4 µs)   | 2.2 µs | 2.4 µs  | 2.4 µs  |
| **POST /todos/** (Create todo)         | 3.6 µs          | 279,100 | ( 3.5 µs … 4.2 µs)   | 3.6 µs | 4.2 µs  | 4.2 µs  |
| **PUT /todos/1** (Update todo)         | 4.0 µs          | 252,700 | ( 3.8 µs … 4.4 µs)   | 4.0 µs | 4.4 µs  | 4.4 µs  |
| **DELETE /todos/2** (Delete todo)      | 2.9 µs          | 343,000 | ( 2.8 µs … 3.0 µs)   | 3.0 µs | 3.0 µs  | 3.0 µs  |

### ElysiaJS Performance Results (Bun 1.1.43 / Apple M1)

For comparison, here is the performance of the exact same API built with
[ElysiaJS](https://elysiajs.com/) running on [Bun](https://bun.sh/) (using mitata):

| Benchmark                              | Time/iter (avg) | (min … max)             | p99      |
| -------------------------------------- | --------------- | ----------------------- | -------- |
| **GET /** (Redirect)                   | 996.15 ns       | (708.00 ns … 509.92 µs) | 4.21 µs  |
| **GET /page** (HTML rendering)         | 7.23 µs         | (4.79 µs … 5.85 ms)     | 26.17 µs |
| **GET /todos/** (List todos)           | 2.01 µs         | (1.50 µs … 591.50 µs)   | 6.96 µs  |
| **GET /todos/1** (Get a specific todo) | 1.99 µs         | (1.50 µs … 615.75 µs)   | 6.83 µs  |
| **POST /todos/** (Create todo)         | 3.67 µs         | (2.67 µs … 1.74 ms)     | 14.71 µs |
| **PUT /todos/1** (Update todo)         | 3.90 µs         | (3.04 µs … 677.75 µs)   | 12.71 µs |
| **DELETE /todos/2** (Delete todo)      | 2.38 µs         | (1.58 µs … 710.29 µs)   | 10.00 µs |
