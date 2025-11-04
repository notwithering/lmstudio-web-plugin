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
		"baseSearchURL",
		"string",
		{
			displayName: "Base Search URL",
			hint: "The base URL to use for the search engine.",
		},
		"http://localhost/search",
	)
	.field(
		"maxResults",
		"numeric",
		{
			displayName: "Max Results",
			hint: "The maximum number of search results to return.\n\n0 = Unlimited",
			slider: {
				min: 0,
				max: 50,
				step: 1,
			}
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
			options: ["af", "ar", "ar-SA", "be", "bg", "bg-BG", "ca", "cs", "cs-CZ", "cy", "da", "da-DK", "de", "de-AT", "de-BE", "de-CH", "de-DE", "el", "el-GR", "en", "en-AU", "en-CA", "en-GB", "en-IE", "en-IN", "en-NZ", "en-PH", "en-PK", "en-SG", "en-US", "en-ZA", "es", "es-AR", "es-CL", "es-CO", "es-ES", "es-MX", "es-PE", "et", "et-EE", "eu", "fa", "fi", "fi-FI", "fr", "fr-BE", "fr-CA", "fr-CH", "fr-FR", "ga", "gd", "gl", "he", "hi", "hr", "hu", "hu-HU", "id", "id-ID", "is", "it", "it-CH", "it-IT", "ja", "ja-JP", "kn", "ko", "ko-KR", "lt", "lv", "ml", "mr", "nb", "nb-NO", "nl", "nl-BE", "nl-NL", "pl", "pl-PL", "pt", "pt-BR", "pt-PT", "ro", "ro-RO", "ru", "ru-RU", "sk", "sl", "sq", "sv", "sv-SE", "ta", "te", "th", "th-TH", "tr", "tr-TR", "uk", "ur", "vi", "vi-VN", "zh", "zh-CN", "zh-HK", "zh-TW"]
		},
		"en-US",
	)
	.field(
		"safeSearch",
		"select",
		{
			displayName: "Safe Search",
			hint: "The level of safety to apply to the search results.",
			options: ["Off", "Moderate", "Strict"],
		},
		"Off",
	)
	.build();

export async function toolsProvider(ctl: ToolsProviderController) {
	return [
		tool({
			name: `Search`,
			description: `Searches the web using SearXNG, supports searching for webpages, images, videos, news, and music.

Parameters:
- query: The search query to use as a string.
- categories: An array of string categories to search in. Must be one of the following: general, images, videos, news, and music.

Suggestions:
- IMPORTANT: After searching do not respond just based on the content summary, instead use the \`Visit\` tool to get the full content of the page to ensure the result is accurate.
- If your first search does not yield the desired results, try making multiple searches with different queries to try to find the desired results.`,
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
				// page: z.number().min(1).optional().default(1),
			},
			implementation: async ({ query, categories }) => {
				const config = ctl.getPluginConfig(configSchema);

				const safeSearchValue = config.get("safeSearch");
				const safeSearch: number =
					safeSearchValue === "Moderate"
						? 1
						: safeSearchValue === "Strict"
							? 2
							: 0;

				const baseURLValue = config.get("baseSearchURL");
				const url = new URL(baseURLValue);

				url.searchParams.append("q", query);
				url.searchParams.append("categories", categories.join(","));
				url.searchParams.append(
					"engines",
					config.get("engines").join(","),
				);
				url.searchParams.append("language", config.get("language"));
				// url.searchParams.append("pageno", page.toString());
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
			name: "Visit",
			description: `Visits a URL and returns the main text content of the page.

Parameters:
- url: The URL to visit.
- returnRaw (optional): Whether to return the raw HTML content of the page. If this is false it returns only the main text content of the page.

Suggestions:
- if returnRaw was set to false and the returned text appears to be wrong, try setting returnRaw to true to get the raw HTML content which may include information wrongly stripped during parsing.
`,
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
