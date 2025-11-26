export async function safeFetch(url: string): Promise<Response> {
	console.log(url);
	const resp = await fetch(url);
	if (!resp.ok) {
		throw new Error(`Request failed (${resp.status} ${resp.statusText})`);
	}
	return resp;
}
