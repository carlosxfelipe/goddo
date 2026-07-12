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
| **GET /** (Redirect)                   | 1.03 µs         | (750.00 ns … 448.58 µs) | 4.50 µs  |
| **GET /page** (HTML rendering)         | 10.38 µs        | (7.58 µs … 5.30 ms)     | 30.33 µs |
| **GET /todos/** (List todos)           | 1.83 µs         | (1.42 µs … 431.29 µs)   | 6.21 µs  |
| **GET /todos/1** (Get a specific todo) | 1.86 µs         | (1.38 µs … 452.08 µs)   | 6.58 µs  |
| **POST /todos/** (Create todo)         | 3.58 µs         | (2.58 µs … 1.56 ms)     | 14.42 µs |
| **PATCH /todos/1** (Update todo)       | 4.06 µs         | (3.08 µs … 596.29 µs)   | 15.17 µs |
| **DELETE /todos/2** (Delete todo)      | 2.18 µs         | (1.63 µs … 661.17 µs)   | 6.67 µs  |
