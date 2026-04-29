import { log } from "helpers/logger";
import { Notice } from "obsidian";

export const showNotice = (message: string, timeout: number = 0, logToConsole: boolean = true) => {
    if (logToConsole) {
        log(message);
    }

    return new Notice(message, timeout);
}

export const setMessage = (notice: Notice | undefined, message: string, logToConsole: boolean = true) => {
    if (logToConsole) {
        log(message);
    }

    notice?.setMessage(message);
}