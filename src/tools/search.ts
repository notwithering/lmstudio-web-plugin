import * as lms from "@lmstudio/sdk";
import { z as zod } from "zod";
import * as utils from "./utils/utils";

export const name = "Search";

export async function config(config: lms.ConfigSchematicsBuilder<{}>) {
	return config.scope("search", (b) =>
		b
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
					hint: "0 = Unlimited",
					slider: { min: 0, max: 50, step: 1 },
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
				["google", "duckduckgo", "wikipedia"],
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
	);
}

const Params = {
	query: zod.string(),
};

export async function tool(
	ctl: lms.ToolsProviderController,
	config: lms.ParsedConfig<any>,
) {
	return lms.tool({
		name: "Search",
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
		parameters: Params,
		implementation: async ({ query }) => {
			const safeSearch = config.get(
				"search.safeSearch",
			) as SafeSearchLevel;

			const url = buildSearxngUrl(
				config.get("search.baseURL"),
				query,
				config.get("search.engines"),
				config.get("search.language"),
				safeSearch,
			);

			const resp = await utils.safeFetch(url.toString());
			const data = (await resp.json()) as { results: any[] };

			const filteredResults = data.results
				.map((r) => ({
					title: r.title,
					summary: r.content,
					url: r.url,
				}))
				.slice(0, config.get("search.maxResults"));

			return { results: filteredResults } as SearchResponse;
		},
	});
}

type SafeSearchLevel = "Off" | "Moderate" | "Strict";
const SAFE_SEARCH_MAP: Record<SafeSearchLevel, number> = {
	Off: 2,
	Moderate: 1,
	Strict: 0,
};

function buildSearxngUrl(
	base: string,
	query: string,
	engines: readonly string[],
	language: string,
	safeSearch: SafeSearchLevel,
): URL {
	const url = new URL(base);
	url.searchParams.set("q", query);
	url.searchParams.set("engines", engines.join(","));
	url.searchParams.set("language", language);
	url.searchParams.set("format", "json");
	url.searchParams.set("safesearch", SAFE_SEARCH_MAP[safeSearch].toString());
	return url;
}

interface SearchResult {
	title: string;
	summary: string;
	url: string;
}

interface SearchResponse {
	results: readonly SearchResult[];
}
