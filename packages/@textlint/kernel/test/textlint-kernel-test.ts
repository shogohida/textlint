// MIT © 2017 azu
"use strict";
import { TextlintMessage } from "@textlint/kernel";
import { TextlintKernel } from "../src/textlint-kernel";
import { errorRule } from "./helper/ErrorRule";
import { createPluginStub, ExampleProcessorOptions } from "./helper/ExamplePlugin";
import { TextlintKernelOptions } from "../src/textlint-kernel-interface";
import { filterRule } from "./helper/FilterRule";
import { TextlintRuleSeverityLevelKeys } from "../src/context/TextlintRuleSeverityLevelKeys";

import assert from "assert";

/**
 * assert: TextlintMessage must have these properties
 */
const assertMessage = (message: TextlintMessage) => {
    assert.strictEqual(typeof message.type, "string");
    assert.strictEqual(typeof message.ruleId, "string");
    assert.strictEqual(typeof message.message, "string");
    assert.strictEqual(typeof message.index, "number");
    assert.strictEqual(typeof message.line, "number");
    assert.strictEqual(typeof message.column, "number");
    assert.ok(
        TextlintRuleSeverityLevelKeys.info === message.severity ||
            message.severity === TextlintRuleSeverityLevelKeys.warning ||
            message.severity === TextlintRuleSeverityLevelKeys.error
    );
};

describe("textlint-kernel", () => {
    describe("#lintText", () => {
        it("should return messages", () => {
            const kernel = new TextlintKernel();
            const { plugin } = createPluginStub({
                extensions: [".md"]
            });
            const options = {
                filePath: "/path/to/file.md",
                ext: ".md",
                plugins: [{ pluginId: "markdown", plugin: plugin }],
                rules: [
                    {
                        ruleId: "error",
                        rule: errorRule,
                        options: { errors: [{ message: "error message", range: [0, 1] }] }
                    }
                ]
            };
            return kernel.lintText("text", options).then((result) => {
                assert.strictEqual(result.filePath, options.filePath);
                assert.strictEqual(result.messages.length, 1);
                result.messages.forEach((message) => assertMessage(message));
            });
        });
        context("when rule has fixer", () => {
            it("should return messages that has `fix` object", () => {
                const kernel = new TextlintKernel();
                const expectedFixObject = {
                    range: [0, 5],
                    text: "fixed"
                };
                const { plugin } = createPluginStub();
                const options = {
                    filePath: "/path/to/file.md",
                    ext: ".md",
                    plugins: [{ pluginId: "markdown", plugin: plugin }],
                    rules: [
                        {
                            ruleId: "error",
                            rule: errorRule,
                            options: {
                                errors: [
                                    {
                                        message: "error message",
                                        range: expectedFixObject.range,
                                        output: expectedFixObject.text
                                    }
                                ]
                            }
                        }
                    ]
                };
                return kernel.lintText("test text", options).then((result) => {
                    assert.strictEqual(result.filePath, options.filePath);
                    assert.strictEqual(result.messages.length, 1);
                    const [message] = result.messages;
                    assertMessage(message);
                    if (typeof message.fix !== "object") {
                        throw new Error("Not found `fix` object");
                    }
                    assert.deepStrictEqual(message.fix, expectedFixObject);
                });
            });
        });
        it("should pass pluginOptions to plugin", () => {
            const kernel = new TextlintKernel();
            const { getOptions, plugin } = createPluginStub();
            const expectedPluginOptions: ExampleProcessorOptions = { testOption: "test" };
            const options = {
                filePath: "/path/to/file.md",
                ext: ".md",
                plugins: [{ pluginId: "example", plugin: plugin, options: expectedPluginOptions }],
                rules: [{ ruleId: "error", rule: errorRule }]
            };
            return kernel.lintText("text", options).then((_result) => {
                const actualPluginOptions = getOptions();
                assert.deepEqual(actualPluginOptions, expectedPluginOptions);
            });
        });
        context("when rule error is match ignoredRange and ruleId", () => {
            it("should not report these error", () => {
                const kernel = new TextlintKernel();
                const { plugin } = createPluginStub();
                const errorRange = [5, 6];
                const ignoreRange = [0, 6];
                const options: TextlintKernelOptions = {
                    filePath: "/path/to/file.md",
                    ext: ".md",
                    plugins: [{ pluginId: "markdown", plugin: plugin }],
                    rules: [
                        {
                            ruleId: "error-id",
                            rule: errorRule,
                            options: {
                                errors: [
                                    {
                                        message: "error message",
                                        range: errorRange
                                    }
                                ]
                            }
                        }
                    ],
                    filterRules: [
                        {
                            ruleId: "filter",
                            rule: filterRule,
                            options: {
                                allows: [
                                    {
                                        range: ignoreRange,
                                        ruleId: "error-id"
                                    }
                                ]
                            }
                        }
                    ]
                };
                return kernel.lintText("text", options).then((results) => {
                    assert.strictEqual(results.messages.length, 0);
                });
            });
            it("ignoreRuleId should be normalized", () => {
                const kernel = new TextlintKernel();
                const { plugin } = createPluginStub();
                const errorRange = [4, 5];
                const ignoreRange = [0, 5];
                const options: TextlintKernelOptions = {
                    filePath: "/path/to/file.md",
                    ext: ".md",
                    plugins: [{ pluginId: "markdown", plugin: plugin }],
                    rules: [
                        {
                            ruleId: "error-id",
                            rule: errorRule,
                            options: {
                                errors: [
                                    {
                                        message: "error message",
                                        range: errorRange
                                    }
                                ]
                            }
                        }
                    ],
                    filterRules: [
                        {
                            ruleId: "filter",
                            rule: filterRule,
                            options: {
                                allows: [
                                    {
                                        range: ignoreRange,
                                        ruleId: "textlint-rule-error-id" // <= normalized to "error-id"
                                    }
                                ]
                            }
                        }
                    ]
                };
                return kernel.lintText("text", options).then((results) => {
                    assert.strictEqual(results.messages.length, 0);
                });
            });
        });
        context("when rule error is match ignoredRange", () => {
            it("should not report these error", () => {
                const kernel = new TextlintKernel();
                const { plugin } = createPluginStub();
                const errorRange = [4, 5];
                const ignoreRange = [0, 5];
                const options: TextlintKernelOptions = {
                    filePath: "/path/to/file.md",
                    ext: ".md",
                    plugins: [{ pluginId: "markdown", plugin: plugin }],
                    rules: [
                        {
                            ruleId: "error",
                            rule: errorRule,
                            options: {
                                errors: [
                                    {
                                        message: "error message",
                                        range: errorRange
                                    }
                                ]
                            }
                        }
                    ],
                    filterRules: [
                        {
                            ruleId: "filter",
                            rule: filterRule,
                            options: {
                                allows: [
                                    {
                                        range: ignoreRange
                                    }
                                ]
                            }
                        }
                    ]
                };

                return kernel.lintText("text", options).then((results) => {
                    assert.strictEqual(results.messages.length, 0);
                });
            });
        });
        context("when pass invalid options", () => {
            it("should throw validation error", () => {
                const kernel = new TextlintKernel({});
                return kernel.lintText("text", { ext: "test", plugins: [{ pluginId: 1 }] } as any).catch((error) => {
                    assert.ok(error instanceof Error);
                });
            });
        });
    });
    describe("#fixText", () => {
        it("should return messages", () => {
            const kernel = new TextlintKernel();
            const { plugin } = createPluginStub();
            const options = {
                filePath: "/path/to/file.md",
                ext: ".md",
                plugins: [{ pluginId: "markdown", plugin: plugin }],
                rules: [
                    {
                        ruleId: "error",
                        rule: errorRule,
                        options: { errors: [{ message: "error message", range: [0, 1] }] }
                    }
                ]
            };
            return kernel.fixText("text", options).then((result) => {
                assert.strictEqual(typeof result.filePath, "string");
                assert.strictEqual(result.messages.length, 1);
                result.messages.forEach((message) => assertMessage(message));
            });
        });
        it("should pass pluginOptions to plugin", () => {
            const kernel = new TextlintKernel();
            const { getOptions, plugin } = createPluginStub();
            const expectedPluginOptions: ExampleProcessorOptions = { testOption: "test" };
            const options = {
                filePath: "/path/to/file.md",
                ext: ".md",
                plugins: [{ pluginId: "example", plugin: plugin, options: expectedPluginOptions }],
                rules: [{ ruleId: "error", rule: errorRule }]
            };
            return kernel.lintText("text", options).then((_result) => {
                const actualPluginOptions = getOptions();
                assert.deepEqual(actualPluginOptions, expectedPluginOptions);
            });
        });
        context("when pass invalid options", () => {
            it("should throw validation error", () => {
                const kernel = new TextlintKernel({});
                return kernel.fixText("text", { ext: "test", plugins: [{ pluginId: 1 }] } as any).catch((error) => {
                    assert.ok(error instanceof Error);
                });
            });
        });
    });
});
