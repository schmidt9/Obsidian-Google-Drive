import { log } from "helpers/logger";
import { Notice } from "obsidian";

export const showNotice = (
	message: string,
	timeout = 0,
	logToConsole = true,
) => {
	if (logToConsole) {
		log(message);
	}

	return new Notice(message, timeout);
};

export const setMessage = (
	notice: Notice | undefined,
	message: string,
	logToConsole = true,
) => {
	if (logToConsole) {
		log(message);
	}

	notice?.setMessage(message);
};
