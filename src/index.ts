import * as lms from "@lmstudio/sdk";

var configSchema: lms.ConfigSchematics<{}>;

export async function main(context: lms.PluginContext) {
	await parseConfig();
	context.withConfigSchematics(configSchema);
	context.withToolsProvider(toolsProvider);
}

import * as search from "./tools/search";
import * as visit from "./tools/visit";
const toolModules = [search, visit];

async function parseConfig() {
	var config = lms.createConfigSchematics();

	for (const module of toolModules) {
		const name: string = module.name;

		const configFunc = module.config;

		config = config.field(
			name + "_label",
			"boolean",
			{
				displayName: name + " •".repeat(30),
				warning: "This doesn't do anything, just a tool divider.",
			},
			false,
		);

		config = await configFunc(config);
	}

	configSchema = config.build();
}

async function toolsProvider(ctl: lms.ToolsProviderController) {
	const toolsArray: lms.Tool[] = [];
	const parsedConfig = ctl.getPluginConfig(configSchema);

	for (const module of toolModules) {
		const toolFunc = module.tool;
		const tool = await toolFunc(ctl, parsedConfig);
		toolsArray.push(tool);
	}

	return toolsArray;
}
