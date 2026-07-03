// sdlc-check — enforcement-spine CLI skeleton.
// Zero-dependency, bare Node ESM. Parses the CLI surface (spec path + repeatable --require) and
// establishes the exit-code contract: any error path exits nonzero with a message on stderr
// naming the problem; nothing here ever exits 0 on failure (fail-closed).
import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function run(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        require: { type: 'string', multiple: true, default: [] },
      },
    });
  } catch (err) {
    process.stderr.write(`sdlc-check: could not parse arguments: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  const [specPath] = parsed.positionals;

  if (!specPath) {
    process.stderr.write('sdlc-check: missing required spec path argument\n');
    process.exitCode = 1;
    return;
  }

  if (!existsSync(specPath)) {
    process.stderr.write(`sdlc-check: spec path does not exist: ${specPath}\n`);
    process.exitCode = 1;
    return;
  }

  // Later tasks: read the spec, apply --require'd artifact checks, report results.
  // For now, an existing spec path with no further checks is not yet a pass or fail decision —
  // this task only implements the missing/unparseable-input failure path.
}

// Portable ESM main-guard: `import.meta.main` only exists from Node v22.18.0 (undefined, thus
// falsy, on the declared floor's earlier 22.x patches — a false guard there would silently no-op
// instead of failing closed). Compare resolved URLs instead: pathToFileURL() resolves the argv
// path absolutely and percent-encodes URL control characters, so this holds under a relative
// invocation (`node ./sdlc-check.mjs`) the same as an absolute one. `process.argv[1]` is guarded
// for undefined (e.g. `node -e '...'`, no script file) since pathToFileURL() throws on non-string
// input.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2));
}
