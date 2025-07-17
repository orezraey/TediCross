import { Embed } from "discord.js";
import { md2html } from "./md2html";
import { TelegramSettings } from "../settings/TelegramSettings";

/**
 * Adds a blank line after the first line of a message (if enabled)
 * @param message The message to process
 * @param enabled Whether to add the blank line
 * @returns The message with a blank line after the first line (if enabled)
 */
function addBlankLineAfterFirstLine(message: string, enabled: boolean): string {
	if (!enabled) {
		return message;
	}

	const lines = message.split("\n");
	if (lines.length <= 1) {
		return message;
	}

	// Insert blank line after first line
	const result = [lines[0], "", ...lines.slice(1)].join("\n");
	return result;
}

/****************************
 * The handleEmbed function *
 ****************************/

/**
 * Takes an embed and converts it to text which Telegram likes
 *
 * @param embed The embed to process
 * @param senderName Name of the sender of the embed
 *
 * @returns A string ready to send to Telegram
 */
export function handleEmbed(embed: Embed, senderName: string, settings: TelegramSettings) {
	// Construct the text to send
	let text = `<b>${senderName}</b>\n`;

	// Handle the title
	if (embed.title !== undefined) {
		const hasUrl = embed.url !== undefined;
		if (hasUrl) {
			text += `<a href="${embed.url}">`;
		}
		text += embed.title;
		if (hasUrl) {
			text += "</a>";
		}
		text += "\n";
	}

	// Handle the description
	if (embed.description !== undefined) {
		text += md2html(embed.description!, settings) + "\n";
	}

	// Handle the fields
	embed.fields.forEach(field => {
		text += `\n<b>${field.name}</b>\n` + md2html(field.value, settings) + "\n";
	});

	// Handle the author part
	if (embed.author !== null) {
		text += "\n<b>Author</b>\n" + embed.author.name + "\n";
	}

	// All done! Add blank line after first line (if enabled)
	return addBlankLineAfterFirstLine(text, settings.addBlankLineAfterFirstLine);
}
