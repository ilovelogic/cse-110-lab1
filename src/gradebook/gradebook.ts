// gradebook.ts: read "name,score" lines from a file and print class statistics.
//
// Run with:  node gradebook.ts scores.csv
//
// The layers, from the outside in:
//   main()        async   entry: argument handling, the one place that reports errors
//   readScores()  async   owns the open file: opens it, so it closes it
//   parseLine()   sync    pure logic: string in, Score out, or throw
//   summarize()   sync    pure logic: Score[] in, Stats out
//
// Only the functions on the path to real I/O are async. The pure functions never
// wait on anything, so `async` stops spreading at them.

import { open } from 'node:fs/promises';

// Expected failures (bad input) get their own error type so the top level can tell
// them apart from unexpected ones (bugs), which deserve a full stack trace.
class InputError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InputError';
    }
}

type Score = { student: string; score: number };
type Stats = { count: number; mean: number; best: Score };

// Synchronous: a throw here travels straight up to whoever called it, like any
// ordinary exception. Inside an async caller, that becomes a rejection.
function parseLine(line: string, lineNumber: number): Score {
    const parts = line.split(',').map((part) => part.trim());
    const [student, rawScore] = parts;
    if (parts.length !== 2 || !student || !rawScore) {
        throw new InputError(`line ${lineNumber}: expected "name,score", got "${line}"`);
    }

    const score = Number(rawScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
        throw new InputError(`line ${lineNumber}: "${rawScore}" is not a score from 0 to 100`);
    }
    return { student, score };
}

function summarize(scores: Score[]): Stats {
    const [first] = scores;
    if (first === undefined) {
        throw new InputError('the file has no scores in it');
    }

    let total = 0;
    let best = first;
    for (const entry of scores) {
        total += entry.score;
        if (entry.score > best.score) {
            best = entry;
        }
    }
    return { count: scores.length, mean: total / scores.length, best };
}

// The file handle is a resource: while it is open, the OS keeps a file descriptor
// reserved for this process. This function opened it, so this function closes it,
// on every way out.
async function readScores(path: string): Promise<Score[]> {
    // Acquire BEFORE `try`. If open() itself fails, there is nothing to close, and
    // `file` is guaranteed to exist everywhere below, including in `finally`.
    const file = await open(path);
    console.log(`  [opened ${path}]`);

    try {
        const scores: Score[] = [];
        let lineNumber = 0;

        // `for await` pauses this function at each line until the line has been
        // read. Node is free to do other work during each pause.
        for await (const line of file.readLines()) {
            lineNumber++;
            const trimmed = line.trim();

            if (trimmed === '') {
                continue; // Expected and harmless: handled right here, no error.
            }
            if (trimmed === 'END') {
                return scores; // Early exit. `finally` still runs before the caller resumes.
            }
            scores.push(parseLine(trimmed, lineNumber)); // A throw here also leaves through `finally`.
        }
        return scores;
    } finally {
        // Cleanup, not handling: after this runs, whatever was happening (a return
        // value or a thrown error) continues on its way to the caller.
        await file.close();
        console.log(`  [closed ${path}]`);
    }
}

async function main(args: string[]): Promise<void> {
    const path = args[2];
    if (path === undefined) {
        throw new InputError('usage: node gradebook.ts <file>');
    }

    // Without this `await`, `scores` would be a Promise<Score[]>, and TypeScript
    // would refuse to pass it to summarize(). See experiment 1 at the bottom.
    const scores = await readScores(path);
    const stats = summarize(scores);

    console.log(`${stats.count} students, mean ${stats.mean.toFixed(1)}`);
    console.log(`top score: ${stats.best.student} (${stats.best.score})`);
}

// The end of the async chain. Nothing awaits main(), so this handler is the last
// chance to deal with a rejection, and the one place that decides how the program
// reports failure. By the time it runs, every `finally` below has already run.
main(process.argv).catch((error: unknown) => {
    if (error instanceof InputError) {
        console.error(`Error: ${error.message}`); // The user's mistake: a short message is enough.
    } else {
        console.error(error); // A bug or system problem: show the full stack trace.
    }
    process.exitCode = 1; // Report failure, but let Node finish writing output first.
});

console.log('(main() has returned a Promise; this line runs before any file is read)');

/* Experiments: predict the output first, then run and compare.

   1. In main(), delete `await` before readScores(path). What does tsc say, and why?
      Then compare with a function that returns Promise<void>: if you call one of
      those without `await`, would tsc complain? (This is the lemonade bug.)

   2. Move `const file = await open(path);` inside the `try` block. What does tsc
      say about the `finally` block?

   3. In the `.catch` handler, change `error instanceof InputError` to `true`, then
      run with a file that does not exist. What useful information did you lose?

   4. Delete the whole `.catch(...)`, then run with bad.csv. Does "[closed bad.csv]"
      still print before the crash? Why? (Hint: which runs first, `finally` or the
      unhandled-rejection check?)
*/
