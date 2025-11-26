import * as lms from "@lmstudio/sdk";
import * as utils from "./utils/utils";
import { z as zod } from "zod";
import * as jsdom from "jsdom";
import * as readability from "@mozilla/readability";

export const name = "Visit";

export async function config(config: lms.ConfigSchematicsBuilder<{}>) {
	return config.scope("visit", (b) =>
		b
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
					hint: "Limit the returned content length of non‑raw `Visit` calls.\n\n0 = Unlimited",
					slider: { min: 0, max: 2 ** 16, step: 2 ** 8 },
				},
				2 ** 12,
			),
	);
}

const Params = {
	url: zod.string().url(),
	returnRaw: zod.boolean().optional().default(false),
};

export async function tool(
	ctl: lms.ToolsProviderController,
	config: lms.ParsedConfig<any>,
) {
	return lms.tool({
		name: "Visit",
		description: `Visits a URL and returns the main text content of the page.

# Parameters
- url: The URL to visit.
- returnRaw (optional): Whether to return the raw HTML content of the page. If this is false it returns only the main text content of the page.

# Response
if returnRaw is false:
- a json object with the following fields:
	- request: request information:
		- url: The URL that was visited
		- status: HTTP status message of the response
	- article: article information:
		- content: Article content
		- title: Article title
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
		parameters: Params,
		implementation: async ({ url, returnRaw }) => {
			const resp = await utils.safeFetch(url);
			const html = await resp.text();

			if (returnRaw || config.get("visit.forceRaw")) {
				return html;
			}

			const dom = new jsdom.JSDOM(html);
			const article = new readability.Readability(
				dom.window.document,
			).parse();

			if (!article) {
				throw new Error("Failed to extract readable content.");
			}

			let cleanText = (article.textContent ?? "")
				.replace(/\n\s*\n/g, "\n")
				.replace(/[ \t]+/g, " ")
				.trim();

			const maxLen = config.get("visit.maxContentLength");
			if (maxLen > 0 && cleanText.length > maxLen) {
				cleanText = cleanText.slice(0, maxLen);
				cleanText += "...Text truncated due to length limit";
			}

			return {
				request: { url, status: resp.statusText },
				article: {
					content: cleanText ?? null,
					title: article.title ?? null,
					excerpt: article.excerpt ?? null,
					byline: article.byline ?? null,
					siteName: article.siteName ?? null,
					lang: article.lang ?? null,
					publishedTime: article.publishedTime ?? null,
				},
			} as VisitResponse;
		},
	});
}

interface ArticleInfo {
	content?: string | null;
	title?: string | null;
	excerpt?: string | null;
	byline?: string | null;
	siteName?: string | null;
	lang?: string | null;
	publishedTime?: string | null;
}

interface VisitResponse {
	request: { url: string; status: string };
	article: ArticleInfo;
}
