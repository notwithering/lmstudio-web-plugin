import {
	createConfigSchematics,
	PluginContext,
	tool,
	ToolsProviderController,
} from "@lmstudio/sdk";
import { z } from "zod";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export async function main(context: PluginContext) {
	context.withConfigSchematics(configSchema);
	context.withToolsProvider(toolsProvider);
}

export const configSchema = createConfigSchematics()
	.field(
		"baseURL",
		"string",
		{
			displayName: "Base URL",
			hint: "The base URL to use for the search engine.",
		},
		"http://localhost/search",
	)
	.field(
		"maxResults",
		"numeric",
		{
			displayName: "Max Results",
			hint: "The maximum number of results to return.",
		},
		5,
	)
	.field(
		"engines",
		"stringArray",
		{
			displayName: "Engines",
			hint: "The engines to search in.",
		},
		["google", "bing", "wikipedia"],
	)
	.field(
		"language",
		"select",
		{
			displayName: "Language",
			hint: "The language to search in.",
			options: ["en-US"], // TODO: add the others
		},
		"en-US",
	)
	.field(
		"safesearch",
		"select",
		{
			displayName: "SafeSearch",
			hint: "The level of safety to apply to the search results.",
			options: ["Off", "Moderate", "Strict"],
		},
		"Off",
	)
	.build();

export async function toolsProvider(ctl: ToolsProviderController) {
	return [
		tool({
			name: `search`,
			description: `Searches the web using SearXNG, supports searching for webpages, images,
videos, news, and music.

Parameters:
- query: The search query to use as a string.
- categories: An array of string categories to search in. Must be one of the
following: general, images, videos, news, and music.
- page: The page number to search on. Start off at 1 and increment if desired results are not
found.

Suggestions:
- IMPORTANT: After searching do not respond just based on the content summary and instead use the
visit tool to get the full content of the page.
- If your first search does not yield the desired results, try making multiple searches with
different queries to ensure the results are accurate.`,
			parameters: {
				query: z.string(),
				categories: z
					.array(
						z.enum([
							"general",
							"images",
							"videos",
							"news",
							"music",
						]), // NOTE: theres more
					)
					.optional()
					.default(["general"]),
				page: z.number().min(1).optional().default(1),
			},
			implementation: async ({ query, categories, page }) => {
				const config = ctl.getPluginConfig(configSchema);

				const safeSearchValue = config.get("safesearch");
				const safeSearch: number =
					safeSearchValue === "Moderate"
						? 1
						: safeSearchValue === "Strict"
							? 2
							: 0;

				const baseURLValue = config.get("baseURL");
				const url = new URL(baseURLValue);

				url.searchParams.append("q", query);
				url.searchParams.append("categories", categories.join(","));
				url.searchParams.append(
					"engines",
					config.get("engines").join(","),
				);
				url.searchParams.append("language", config.get("language"));
				url.searchParams.append("pageno", page.toString());
				url.searchParams.append("format", "json");
				url.searchParams.append("safesearch", safeSearch.toString());

				const response = await fetch(url.toString());
				if (!response.ok) {
					return `Failed to make request: ${response.statusText}`;
				}

				const data = await response.json();

				const filteredResults = data.results
					.map((r: any) => ({
						url: r.url,
						title: r.title,
						content: r.content,
					}))
					.slice(0, config.get("maxResults"));

				const output = {
					results: filteredResults,
				};

				return output;
			},
		}),
		tool({
			name: "visit",
			description: `Visits a URL and returns the main text content of the page.

Parameters:
- url: The URL of the website to visit..
- returnRaw (optional): Whether to return the raw HTML content of the page. If this is false it returns only
the main text content of the page. This parameter should only be used in cases where the tool
misidentifies the main content.`,
			parameters: {
				url: z.string().url(),
				returnRaw: z.boolean().optional().default(false),
			},
			implementation: async ({ url, returnRaw }) => {
				const response = await fetch(url);
				if (!response.ok) {
					return `Failed to make request: ${response.statusText}`;
				}

				const html = await response.text();
				if (returnRaw) {
					return html;
				}

				const dom = new JSDOM(html);
				const reader = new Readability(dom.window.document);
				const article = reader.parse();
				const cleanText = (article?.textContent ?? "")
					.replace(/\n\s*\n/g, "\n")
					// .replace(/[ \t]+/g, " ")
					.trim();

				return cleanText;
			},
		}),
	];
}
