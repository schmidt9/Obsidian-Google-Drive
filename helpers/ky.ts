import ky, { Hooks } from "ky";
import ObsidianGoogleDrive from "main";
import { checkConnection } from "./drive";
import { showNotice } from "./notice";
import { log } from "./logger";

const getHooks = (t: ObsidianGoogleDrive): Hooks => ({
	beforeRequest: [
		async (request) => {
			if (t.accessToken.token) {
				if (t.accessToken.expiresAt - Date.now() < 60000) {
					await refreshAccessToken(t);
				}
				request.headers.set(
					"Authorization",
					`Bearer ${t.accessToken.token}`
				);
			}
			return request;
		},
	],
	afterResponse: [
		async (request, options, response) => {
			if (!response.ok) {
				showNotice(`Error: ${await response.text()}`);
				return new Response();
			}
			return response;
		},
	],
});

export const getDriveKy = (t: ObsidianGoogleDrive) => {
	return ky.extend({
		prefixUrl: "https://www.googleapis.com",
		hooks: getHooks(t),
		timeout: 120_000,
	});
};

export const refreshAccessToken = async (t: ObsidianGoogleDrive) => {
	try {
		log(refreshAccessToken.name);

		const { expires_in, access_token } = await ky
			.post("https://ogd.richardxiong.com/api/access", {
				json: { refresh_token: t.settings.refreshToken },
			})
			.json<any>();

		t.accessToken = {
			token: access_token,
			expiresAt: Date.now() + expires_in * 1000,
		};
		return t.accessToken;
	} catch (e: any) {
		if (!(await checkConnection())) {
			return showNotice(
				"Something is wrong with your internet connection, so we could not fetch a new access token! Once you're back online, please restart Obsidian."
			);
		}
		t.settings.refreshToken = "";
		t.accessToken = {
			token: "",
			expiresAt: 0,
		};

		showNotice(
			"Something is wrong with your refresh token, please restart Obsidian and then reset it."
		);
		await t.saveSettings();
		return;
	}
};
