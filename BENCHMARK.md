## Benchmarks

This project includes benchmarks to test the performance of the Goddo framework using Deno's
built-in benchmarking tool.

To run the benchmarks, execute the following command:

```bash
deno bench benchmarks/
```

### Performance Results (Local Workspace / Deno 2.9.2 / Apple M1)

| Benchmark                              | Time/iter (avg) | Iter/s  | (min … max)           | p75     | p99     | p995    |
| -------------------------------------- | --------------- | ------- | --------------------- | ------- | ------- | ------- |
| **GET /** (Redirect)                   | 1.8 µs          | 556,200 | ( 1.2 µs … 3.0 ms)    | 1.5 µs  | 4.1 µs  | 6.2 µs  |
| **GET /page** (HTML rendering)         | 17.6 µs         | 56,700  | ( 15.2 µs … 486.3 µs) | 17.1 µs | 30.0 µs | 39.5 µs |
| **GET /todos/** (List todos)           | 2.0 µs          | 508,800 | ( 1.9 µs … 2.1 µs)    | 2.0 µs  | 2.1 µs  | 2.1 µs  |
| **GET /todos/1** (Get a specific todo) | 2.3 µs          | 433,000 | ( 2.2 µs … 2.7 µs)    | 2.3 µs  | 2.7 µs  | 2.7 µs  |
| **POST /todos/** (Create todo)         | 4.0 µs          | 247,400 | ( 3.7 µs … 7.8 µs)    | 3.9 µs  | 7.8 µs  | 7.8 µs  |
| **PATCH /todos/1** (Update todo)       | 4.3 µs          | 232,700 | ( 4.1 µs … 4.9 µs)    | 4.5 µs  | 4.9 µs  | 4.9 µs  |
| **DELETE /todos/2** (Delete todo)      | 3.1 µs          | 327,400 | ( 2.9 µs … 3.2 µs)    | 3.1 µs  | 3.2 µs  | 3.2 µs  |

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
