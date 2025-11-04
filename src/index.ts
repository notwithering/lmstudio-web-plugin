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

const longLineText = " •".repeat(30);

export const configSchema = createConfigSchematics()
	.scope("search", (b) =>
		b
			.field(
				"",
				"boolean",
				{
					displayName: "Search" + longLineText,
				},
				false,
			)
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
					hint: "The maximum number of search results to return.\n\n0 = Unlimited",
					slider: {
						min: 0,
						max: 50,
						step: 1,
					},
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
				"safeSearch",
				"select",
				{
					displayName: "Safe Search",
					hint: "The level of safety to apply to the search results.",
					options: ["Off", "Moderate", "Strict"],
					warning: "This setting doesn't work at the moment.",
					nonConfigurable: true,
				},
				"Off",
			)
			.field(
				"language",
				"select",
				{
					displayName: "Language",
					hint: "The language to search in.",
					options: [
						"af",
						"ar",
						"ar-SA",
						"be",
						"bg",
						"bg-BG",
						"ca",
						"cs",
						"cs-CZ",
						"cy",
						"da",
						"da-DK",
						"de",
						"de-AT",
						"de-BE",
						"de-CH",
						"de-DE",
						"el",
						"el-GR",
						"en",
						"en-AU",
						"en-CA",
						"en-GB",
						"en-IE",
						"en-IN",
						"en-NZ",
						"en-PH",
						"en-PK",
						"en-SG",
						"en-US",
						"en-ZA",
						"es",
						"es-AR",
						"es-CL",
						"es-CO",
						"es-ES",
						"es-MX",
						"es-PE",
						"et",
						"et-EE",
						"eu",
						"fa",
						"fi",
						"fi-FI",
						"fr",
						"fr-BE",
						"fr-CA",
						"fr-CH",
						"fr-FR",
						"ga",
						"gd",
						"gl",
						"he",
						"hi",
						"hr",
						"hu",
						"hu-HU",
						"id",
						"id-ID",
						"is",
						"it",
						"it-CH",
						"it-IT",
						"ja",
						"ja-JP",
						"kn",
						"ko",
						"ko-KR",
						"lt",
						"lv",
						"ml",
						"mr",
						"nb",
						"nb-NO",
						"nl",
						"nl-BE",
						"nl-NL",
						"pl",
						"pl-PL",
						"pt",
						"pt-BR",
						"pt-PT",
						"ro",
						"ro-RO",
						"ru",
						"ru-RU",
						"sk",
						"sl",
						"sq",
						"sv",
						"sv-SE",
						"ta",
						"te",
						"th",
						"th-TH",
						"tr",
						"tr-TR",
						"uk",
						"ur",
						"vi",
						"vi-VN",
						"zh",
						"zh-CN",
						"zh-HK",
						"zh-TW",
					],
				},
				"en-US",
			),
	)
	.scope("visit", (b) =>
		b
			.field(
				"",
				"boolean",
				{
					displayName: "Visit" + longLineText,
				},
				false,
			)
			.field(
				"forceRaw",
				"boolean",
				{
					displayName: "Force Raw",
					hint: "Force `Visit` calls to return raw HTML instead of parsed plain text.",
					warning:
						"This will heavily increase token usage and will likely confuse the AI.",
				},
				false,
			)
			.field(
				"maxContentLength",
				"numeric",
				{
					displayName: "Max Content Length",
					hint: "Limit the returned content length of non-raw `Visit` calls.\n\n0 = Unlimited",
					slider: {
						min: 0,
						max: 2 ** 16,
						step: 2 ** 8,
					},
				},
				2 ** 12,
			),
	)
	.build();

export async function toolsProvider(ctl: ToolsProviderController) {
	return [
		tool({
			name: `Search`,
			description: `Searches the web using SearXNG, supports searching for webpages, images, videos, news, and music.

# Parameters
- query: The search query as a string.

# Response
- a json object with one field \`results\` that is an array of objects with the following fields:
	- title: The title of the result.
	- summary: A short summary of the result.
	- url: The URL of the result.

# Suggestions
- After searching do NOT respond just based on the content summary, instead use the \`Visit\` tool to get the full content of the page to ensure the result is accurate.
- If your first search does not yield the desired results, try making multiple searches with different queries to try to find the desired results.`,
			parameters: {
				query: z.string(),
				// categories: z
				// 	.array(
				// 		z.enum([
				// 			"general",
				// 			"images",
				// 			"videos",
				// 			"news",
				// 			"music",
				// 		]), // NOTE: theres more
				// 	)
				// 	.optional()
				// 	.default(["general"]),
				// page: z.number().min(1).optional().default(1),
			},
			implementation: async ({ query }) => {
				const config = ctl.getPluginConfig(configSchema);

				const safeSearchValue = config.get("search.safeSearch");
				const safeSearch: number =
					safeSearchValue === "Moderate"
						? 1
						: safeSearchValue === "Strict"
							? 0
							: 2;

				const baseURLValue = config.get("search.baseURL");
				const url = new URL(baseURLValue);

				url.searchParams.append("q", query);
				// url.searchParams.append("categories", categories.join(","));
				url.searchParams.append(
					"engines",
					config.get("search.engines").join(","),
				);
				url.searchParams.append(
					"language",
					config.get("search.language"),
				);
				// url.searchParams.append("pageno", page.toString());
				url.searchParams.append("format", "json");
				url.searchParams.append("safesearch", safeSearch.toString());

				console.log(url.toString());

				const response = await fetch(url.toString());
				if (!response.ok) {
					return `Failed to make request: ${response.statusText}`;
				}

				const data = await response.json();

				const filteredResults = data.results
					.map((r: any) => ({
						title: r.title,
						summary: r.content,
						url: r.url,
					}))
					.slice(0, config.get("search.maxResults"));

				const output = {
					results: filteredResults,
				};

				return output;
			},
		}),
		tool({
			name: "Visit",
			description: `Visits a URL and returns the main text content of the page.

# Parameters
- url: The URL to visit.
- returnRaw (optional): Whether to return the raw HTML content of the page. If this is false it returns only the main text content of the page.

# Response
if returnRaw is false:
	- a json object with the following fields:
		- title: Article title
		- content: Article content
		- excerpt: Article excerpt
		- byline: Byline of the article
		- siteName: The website name
		- lang: Article language
		- publishedTime: Article published time
if returnRaw is true:
	- the raw HTML content of the page

# Suggestions
- Keep returnRaw as false and only try again with it true if the returned text appears to be wrong.
- If the returned text appears to be HTML, but you don't recall setting returnRaw to true, it is very likely that the user decided to force the tool to return HTML, so you should try to parse as it is.
`,
			parameters: {
				url: z.string().url(),
				returnRaw: z.boolean().optional().default(false),
			},
			implementation: async ({ url, returnRaw }) => {
				const config = ctl.getPluginConfig(configSchema);

				const response = await fetch(url);
				if (!response.ok) {
					return `Failed to make request: ${response.statusText}`;
				}

				const html = await response.text();
				if (returnRaw || config.get("visit.forceRaw")) {
					return html;
				}

				const dom = new JSDOM(html);
				const reader = new Readability(dom.window.document);
				const article = reader.parse();

				if (!article) {
					return "Failed to extract readable content.";
				}

				let cleanText = (article.textContent ?? "")
					.replace(/\n\s*\n/g, "\n")
					.replace(/[ \t]+/g, " ")
					.trim();

				const maxContentLength = config.get("visit.maxContentLength");
				if (
					maxContentLength > 0 &&
					cleanText.length > maxContentLength
				) {
					cleanText = cleanText.slice(0, maxContentLength);
					cleanText += "...Text truncated due to length limit";
				}

				return {
					title: article.title,
					content: cleanText,
					excerpt: article.excerpt,
					byline: article.byline,
					siteName: article.siteName,
					lang: article.lang,
					publishedTime: article.publishedTime,
				};
			},
		}),
	];
}
