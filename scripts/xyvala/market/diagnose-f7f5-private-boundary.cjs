"use strict";

/* ============================================================================
 * FILE: scripts/xyvala/market/diagnose-f7f5-private-boundary.cjs
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Market F7F.5 private-boundary diagnostic
 *
 * DIAGNOSTIC VERSION
 * - 1.0.1
 *
 * ROLE
 * - observe the first real Stage 6 private adapter return
 * - observe caught PrivateScanAsset factory exceptions
 * - execute the existing F7F.5 end-to-end validator unchanged
 * - provide diagnostic evidence without becoming an analytical producer
 *
 * CLASSIFICATION
 * - PRIVATE DEVELOPMENT DIAGNOSTIC
 * - OBSERVE
 * - NON-COMPUTE
 * - NON-MUTATING BY ITSELF
 * - NON-PUBLIC
 *
 * IMPORTANT
 * - this harness does not patch Market runtime source
 * - this harness does not replace exports
 * - this harness does not replay analytical logic
 * - this harness does not create analytical truth
 * - provider fixtures, development guards, controlled PostgreSQL fixture
 *   mutations and cleanup remain owned by the existing F7F.5 validator
 * - debugger timing is diagnostic evidence, not normal-run acceptance proof
 *
 * TYPESCRIPT LOADING
 * - Node 20 cannot directly execute the project TypeScript used by this
 *   diagnostic path
 * - use the already-established Xyvala project-local TypeScript loader pattern
 * - resolve project-local TypeScript from the repository package boundary
 * - resolve @/ imports to the repository root
 * - transpile in memory only
 * - no package installation
 * - no generated project files
 * - no tsconfig mutation
 * - no runtime-source mutation
 *
 * FIRST DIVERGENCE
 * - a diagnostic bootstrap failure is reported separately from a Market
 *   analytical/runtime failure
 * - malformed or unloadable diagnostic dependencies are never repaired
 * - factory exceptions remain observed at the real factory boundary
 *
 * VERSION GOVERNANCE
 * - 1.0.1 is a harness implementation correction
 * - report semantics and diagnostic scope remain unchanged
 * - reviewed TypeScript runtime version is explicit and must not drift silently
 * ========================================================================== */

const {
  Worker,
  isMainThread,
  workerData,
} = require("node:worker_threads");

const DIAGNOSTIC_NAME =
  "xyvala_f7f5_private_boundary";

const DIAGNOSTIC_VERSION =
  "1.0.1";

const DIAGNOSTIC_SCOPE =
  "FIRST_REAL_STAGE_6_ADAPTER_RETURN";

const REVIEWED_TYPESCRIPT_VERSION =
  "5.4.5";

const OBSERVER_KEY =
  "__xyvala_f7f5_private_diagnostic_targets__";

const OBSERVER_SETUP_TIMEOUT_MS =
  15_000;

/* ============================================================================
 * 1. SAFE DIAGNOSTIC ERROR CLASSIFICATION
 * ----------------------------------------------------------------------------
 * No raw stack or local filesystem path is emitted in the public terminal
 * report. The detailed exception remains available to the local developer when
 * instrumenting this private harness explicitly.
 * ========================================================================== */

function classifyStartupFailure(
  error,
) {
  const message =
    error instanceof Error
      ? error.message
      : "";

  const controlledMessages =
    new Set([
      "diagnostic_project_root_invalid",
      "diagnostic_typescript_unavailable",
      "diagnostic_typescript_version_review_required",
      "diagnostic_target_collision",
      "diagnostic_target_invalid",
      "diagnostic_setup_timeout",
      "diagnostic_setup_failed",
      "next_env_loading_failed",
    ]);

  if (
    controlledMessages.has(
      message,
    )
  ) {
    return message;
  }

  if (
    error &&
    typeof error === "object" &&
    error.code ===
      "MODULE_NOT_FOUND"
  ) {
    return "diagnostic_module_not_found";
  }

  if (
    error instanceof SyntaxError
  ) {
    return "diagnostic_syntax_error";
  }

  return "private_diagnostic_startup_failed";
}

/* ============================================================================
 * 2. PROJECT-LOCAL TYPESCRIPT LOADER
 * ----------------------------------------------------------------------------
 * Reuses the established Xyvala Search diagnostic/deployment loader pattern.
 *
 * This is a process-local diagnostic capability only.
 * ========================================================================== */

function installProjectTypeScriptLoader(
  root,
) {
  const fs =
    require("node:fs");

  const path =
    require("node:path");

  const Module =
    require("node:module");

  const packageJson =
    path.join(
      root,
      "package.json",
    );

  if (
    !fs.existsSync(
      packageJson,
    )
  ) {
    throw new Error(
      "diagnostic_project_root_invalid",
    );
  }

  const localRequire =
    Module.createRequire(
      packageJson,
    );

  let ts;

  try {
    ts =
      localRequire(
        "typescript",
      );
  } catch {
    throw new Error(
      "diagnostic_typescript_unavailable",
    );
  }

  if (
    ts.version !==
      REVIEWED_TYPESCRIPT_VERSION
  ) {
    throw new Error(
      "diagnostic_typescript_version_review_required",
    );
  }

  const originalResolveFilename =
    Module._resolveFilename;

  const originalTsExtension =
    Module._extensions[".ts"];

  let restored =
    false;

  Module._resolveFilename =
    function (
      request,
      parent,
      ...rest
    ) {
      const resolvedRequest =
        typeof request ===
          "string" &&
        request.startsWith(
          "@/",
        )
          ? path.join(
              root,
              request.slice(
                2,
              ),
            )
          : request;

      return originalResolveFilename.call(
        this,
        resolvedRequest,
        parent,
        ...rest,
      );
    };

  Module._extensions[".ts"] =
    function (
      mod,
      filename,
    ) {
      const result =
        ts.transpileModule(
          fs.readFileSync(
            filename,
            "utf8",
          ),
          {
            fileName:
              filename,
            compilerOptions: {
              target:
                ts.ScriptTarget
                  .ES2022,
              module:
                ts.ModuleKind
                  .CommonJS,
              esModuleInterop:
                true,
            },
          },
        );

      mod._compile(
        result.outputText,
        filename,
      );
    };

  return Object.freeze({
    localRequire,
    typescriptVersion:
      ts.version,

    restore() {
      if (
        restored
      ) {
        return;
      }

      restored =
        true;

      Module._resolveFilename =
        originalResolveFilename;

      if (
        originalTsExtension
      ) {
        Module._extensions[".ts"] =
          originalTsExtension;
      } else {
        delete Module
          ._extensions[".ts"];
      }
    },
  });
}

/* ============================================================================
 * 3. OBSERVER WORKER
 * ----------------------------------------------------------------------------
 * Inspector-only observation.
 *
 * The worker attaches to the main thread and observes:
 * - the real adapter return
 * - exceptions whose call stack crosses the real factory function
 * ========================================================================== */

async function observerWorker() {
  const {
    parentPort,
    workerData:
      localWorkerData,
  } =
    require("node:worker_threads");

  const {
    Session,
  } =
    require("node:inspector");

  const session =
    new Session();

  let closed =
    false;

  parentPort.on(
    "message",
    () => {},
  );

  const post =
    (
      method,
      params = {},
    ) =>
      new Promise(
        (
          resolve,
          reject,
        ) => {
          session.post(
            method,
            params,
            (
              error,
              result,
            ) => {
              if (
                error
              ) {
                reject(
                  error,
                );
              } else {
                resolve(
                  result,
                );
              }
            },
          );
        },
      );

  const close =
    async () => {
      if (
        closed
      ) {
        return;
      }

      closed =
        true;

      try {
        await post(
          "Debugger.disable",
        );
      } catch {
        // Diagnostic cleanup only.
      }

      session.disconnect();
      parentPort.close();
    };

  const fail =
    async () => {
      parentPort.postMessage({
        type:
          "failed",
        error:
          "private_diagnostic_observer_failed",
      });

      await close();
    };

  parentPort.on(
    "message",
    (message) => {
      if (
        message ===
          "stop"
      ) {
        void close();
      }
    },
  );

  try {
    session.connectToMainThread();

    await post(
      "Debugger.enable",
    );

    const locationOf =
      async (
        name,
      ) => {
        const {
          result,
        } =
          await post(
            "Runtime.evaluate",
            {
              expression:
                `globalThis[${JSON.stringify(localWorkerData.key)}].${name}`,
            },
          );

        if (
          !result?.objectId
        ) {
          throw new Error(
            "diagnostic_function_reference_missing",
          );
        }

        const properties =
          await post(
            "Runtime.getProperties",
            {
              objectId:
                result.objectId,
            },
          );

        const location =
          properties
            .internalProperties
            ?.find(
              (property) =>
                property.name ===
                  "[[FunctionLocation]]",
            )
            ?.value
            ?.value;

        if (
          !location
        ) {
          throw new Error(
            "diagnostic_function_location_missing",
          );
        }

        return location;
      };

    const adapterLocation =
      await locationOf(
        "adapter",
      );

    const factoryLocation =
      await locationOf(
        "factory",
      );

    const {
      locations,
    } =
      await post(
        "Debugger.getPossibleBreakpoints",
        {
          start:
            adapterLocation,
          restrictToFunction:
            true,
        },
      );

    const returnPoints =
      locations.filter(
        (location) =>
          location.type ===
            "return",
      );

    if (
      returnPoints.length ===
        0
    ) {
      throw new Error(
        "diagnostic_return_point_missing",
      );
    }

    const breakpointIds =
      new Set();

    for (
      const {
        scriptId,
        lineNumber,
        columnNumber,
      }
      of returnPoints
    ) {
      const {
        breakpointId,
      } =
        await post(
          "Debugger.setBreakpoint",
          {
            location: {
              scriptId,
              lineNumber,
              columnNumber,
            },
          },
        );

      breakpointIds.add(
        breakpointId,
      );
    }

    const factoryErrors =
      [];

    session.on(
      "Debugger.paused",
      ({
        params,
      }) => {
        void (
          async () => {
            if (
              params.reason ===
                "exception" &&
              params.callFrames.some(
                (frame) =>
                  frame.location
                    .scriptId ===
                    factoryLocation
                      .scriptId,
              )
            ) {
              const firstLine =
                String(
                  params.data
                    ?.description ??
                    "",
                )
                  .split(
                    "\n",
                  )[0];

              const match =
                /^Error: (scan_asset_factory_[a-z0-9_]+)$/
                  .exec(
                    firstLine,
                  );

              factoryErrors.push(
                match
                  ? match[1]
                  : "unclassified_factory_exception",
              );
            }

            if (
              params
                .hitBreakpoints
                ?.some(
                  (id) =>
                    breakpointIds
                      .has(
                        id,
                      ),
                )
            ) {
              const returned =
                params
                  .callFrames[0]
                  .returnValue;

              if (
                !returned?.objectId
              ) {
                throw new Error(
                  "diagnostic_return_value_missing",
                );
              }

              const {
                result,
                exceptionDetails,
              } =
                await post(
                  "Runtime.callFunctionOn",
                  {
                    objectId:
                      returned.objectId,
                    functionDeclaration:
                      `function () {
                        return {
                          ok: this.ok,
                          count: this.count,
                          rejected_count: this.rejected_count,
                          warnings: this.warnings
                        };
                      }`,
                    returnByValue:
                      true,
                  },
                );

              if (
                exceptionDetails ||
                !result.value
              ) {
                throw new Error(
                  "diagnostic_return_read_failed",
                );
              }

              parentPort.postMessage({
                type:
                  "observed",
                report: {
                  private_adapter:
                    result.value,
                  factory_errors:
                    factoryErrors,
                },
              });

              await close();

              return;
            }

            await post(
              "Debugger.resume",
            );
          }
        )().catch(
          fail,
        );
      },
    );

    await post(
      "Debugger.setPauseOnExceptions",
      {
        state:
          "all",
      },
    );

    parentPort.postMessage({
      type:
        "ready",
    });
  } catch {
    await fail();
  }
}

/* ============================================================================
 * 4. MAIN-THREAD OBSERVER BINDING
 * ========================================================================== */

async function startObserver(
  adapter,
  factory,
  emit,
) {
  if (
    Object.hasOwn(
      globalThis,
      OBSERVER_KEY,
    )
  ) {
    throw new Error(
      "diagnostic_target_collision",
    );
  }

  if (
    typeof adapter !==
      "function" ||
    typeof factory !==
      "function"
  ) {
    throw new Error(
      "diagnostic_target_invalid",
    );
  }

  Object.defineProperty(
    globalThis,
    OBSERVER_KEY,
    {
      value: {
        adapter,
        factory,
      },
      configurable:
        true,
    },
  );

  let worker;
  let observed =
    false;
  let failed =
    false;
  let stopped =
    false;

  try {
    worker =
      new Worker(
        __filename,
        {
          workerData: {
            key:
              OBSERVER_KEY,
            xyvalaPrivateObserver:
              true,
          },
          execArgv:
            [],
        },
      );

    await new Promise(
      (
        resolve,
        reject,
      ) => {
        let ready =
          false;

        const timeout =
          setTimeout(
            () => {
              reject(
                new Error(
                  "diagnostic_setup_timeout",
                ),
              );
            },
            OBSERVER_SETUP_TIMEOUT_MS,
          );

        const failure =
          () => {
            clearTimeout(
              timeout,
            );

            if (
              !failed
            ) {
              failed =
                true;

              emit({
                status:
                  "DIAGNOSTIC_FAILED",
                error:
                  "private_diagnostic_observer_failed",
              });
            }

            if (
              !ready
            ) {
              reject(
                new Error(
                  "diagnostic_setup_failed",
                ),
              );
            }
          };

        worker.on(
          "error",
          failure,
        );

        worker.on(
          "exit",
          () => {
            if (
              !observed &&
              !failed &&
              !stopped
            ) {
              failure();
            }
          },
        );

        worker.on(
          "message",
          (message) => {
            if (
              message.type ===
                "ready"
            ) {
              ready =
                true;

              clearTimeout(
                timeout,
              );

              resolve();
            } else if (
              message.type ===
                "observed"
            ) {
              observed =
                true;

              emit({
                status:
                  "OBSERVED",
                ...message.report,
              });
            } else if (
              message.type ===
                "failed"
            ) {
              failure();
            }
          },
        );
      },
    );

    return {
      worker,

      get observed() {
        return observed;
      },

      get failed() {
        return failed;
      },

      stop() {
        if (
          stopped
        ) {
          return;
        }

        stopped =
          true;

        worker.postMessage(
          "stop",
        );
      },
    };
  } catch (
    error
  ) {
    stopped =
      true;

    if (
      worker
    ) {
      await worker
        .terminate();
    }

    throw error;
  } finally {
    delete globalThis[
      OBSERVER_KEY
    ];
  }
}

/* ============================================================================
 * 5. DIAGNOSTIC MAIN
 * ========================================================================== */

async function main() {
  const path =
    require("node:path");

  const {
    readFileSync,
  } =
    require("node:fs");

  const {
    createHash,
  } =
    require("node:crypto");

  const root =
    path.resolve(
      __dirname,
      "../../..",
    );

  const loader =
    installProjectTypeScriptLoader(
      root,
    );

  let observer =
    null;

  let loaderRestored =
    false;

  const restoreLoader =
    () => {
      if (
        loaderRestored
      ) {
        return;
      }

      loaderRestored =
        true;

      loader.restore();
    };

  try {
    const {
      loadEnvConfig,
    } =
      loader.localRequire(
        "@next/env",
      );

    loadEnvConfig(
      root,
      true,
      {
        info:
          () => {},
        error:
          () => {
            throw new Error(
              "next_env_loading_failed",
            );
          },
      },
    );

    const files =
      Object.freeze({
        adapter:
          "lib/xyvala/stores/market-traceability-adapter.ts",
        factory:
          "lib/xyvala/factories/scan-asset-factory.ts",
        triple_layer:
          "lib/xyvala/engine/triple-layer-market-private-adapter.ts",
        private_contract:
          "lib/xyvala/contracts/scan-private-contract.ts",
        validator:
          "scripts/xyvala/market/validate-canonical-historical-runtime-end-to-end.ts",
      });

    const absoluteFiles =
      Object.fromEntries(
        Object.entries(
          files,
        ).map(
          (
            [
              name,
              file,
            ],
          ) => [
            name,
            path.join(
              root,
              file,
            ),
          ],
        ),
      );

    const sourceSha256 =
      Object.fromEntries(
        Object.entries(
          absoluteFiles,
        ).map(
          (
            [
              name,
              file,
            ],
          ) => [
            name,
            createHash(
              "sha256",
            )
              .update(
                readFileSync(
                  file,
                ),
              )
              .digest(
                "hex",
              ),
          ],
        ),
      );

    const emit =
      (
        report,
      ) =>
        process.stderr.write(
          JSON.stringify(
            {
              diagnostic:
                DIAGNOSTIC_NAME,
              diagnostic_version:
                DIAGNOSTIC_VERSION,
              scope:
                DIAGNOSTIC_SCOPE,
              typescript_version:
                loader
                  .typescriptVersion,
              source_sha256:
                sourceSha256,
              ...report,
            },
            null,
            2,
          ) +
            "\n",
        );

    /*
     * Contract Before Runtime:
     * load the actual adapter and factory only after the reviewed project-local
     * TypeScript boundary is installed.
     */
    const adapter =
      loader.localRequire(
        absoluteFiles.adapter,
      );

    const factory =
      loader.localRequire(
        absoluteFiles.factory,
      );

    observer =
      await startObserver(
        adapter
          .adaptMarketEvaluationsToPrivateScanAssets,
        factory
          .buildPrivateScanAsset,
        emit,
      );

    /*
     * A missing Stage 6 must not keep the validator process alive indefinitely.
     */
    observer.worker.unref();

    /*
     * Keep the TypeScript loader active through the asynchronously executing
     * validator. Restore only when the process has no additional scheduled work.
     */
    process.once(
      "beforeExit",
      () => {
        if (
          observer &&
          !observer.observed &&
          !observer.failed
        ) {
          emit({
            status:
              "NOT_OBSERVED",
            error:
              "stage_6_return_not_observed",
          });

          observer.stop();
        }

        restoreLoader();
      },
    );

    /*
     * Existing validator owns:
     * - provider fixtures
     * - development guards
     * - controlled PostgreSQL test mutations
     * - cleanup
     * - validator exit status
     *
     * This harness only observes it.
     */
    try {
      loader.localRequire(
        absoluteFiles.validator,
      );
    } catch (
      error
    ) {
      observer.stop();

      restoreLoader();

      throw error;
    }
  } catch (
    error
  ) {
    if (
      observer
    ) {
      observer.stop();
    }

    restoreLoader();

    throw error;
  }
}

/* ============================================================================
 * 6. ENTRY POINT
 * ========================================================================== */

module.exports = {
  startObserver,
};

if (
  !isMainThread &&
  workerData
    ?.xyvalaPrivateObserver ===
      true
) {
  void observerWorker();
} else if (
  require.main ===
    module
) {
  void main().catch(
    (
      error,
    ) => {
      process.stderr.write(
        JSON.stringify(
          {
            diagnostic:
              DIAGNOSTIC_NAME,
            diagnostic_version:
              DIAGNOSTIC_VERSION,
            status:
              "STARTUP_FAILED",
            error:
              "private_diagnostic_startup_failed",
            first_divergence:
              classifyStartupFailure(
                error,
              ),
          },
          null,
          2,
        ) +
          "\n",
      );

      process.exitCode =
        1;
    },
  );
}
