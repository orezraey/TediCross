import { InputMediaPhoto } from "telegraf/types";
import { Logger } from "../Logger";

/**
 * Interface for image data that can be cleaned up
 */
interface CleanableInputMediaPhoto extends InputMediaPhoto {
	_cleanup?: () => void;
}

/**
 * Extracts image URLs from Discord markdown text and downloads them
 * Handles patterns like [:camera:](https://pbs.twimg.com/media/image.jpg)
 *
 * @param content The message content with markdown
 * @param logger Logger instance
 * @returns Array of InputMediaPhoto objects and cleaned text
 */
export async function extractMarkdownImages(
	content: string,
	logger: Logger
): Promise<{ images: CleanableInputMediaPhoto[]; cleanedText: string }> {
	const images: CleanableInputMediaPhoto[] = [];

	// Regex to match [📷](URL) or similar emoji markdown patterns with URLs
	const imageMarkdownRegex = /\[📷\]\((https?:\/\/[^\s)]+)\)/g;

	logger.info(`Analyzing message content for markdown images: ${content}`);

	const matches = [...content.matchAll(imageMarkdownRegex)];
	logger.info(`Found ${matches.length} potential markdown image patterns`);

	// Track processed URLs to avoid duplicates
	const processedUrls = new Set<string>();

	for (const [index, match] of matches.entries()) {
		const fullMatch = match[0]; // Full match like [:camera:](URL)
		const imageUrl = match[1]; // Just the URL

		logger.info(`Processing markdown image ${index + 1}: ${fullMatch} -> ${imageUrl}`);

		// Check if this is a Twitter/X media URL
		const isTwitterMedia =
			imageUrl.includes("pbs.twimg.com") ||
			imageUrl.includes("video.twimg.com") ||
			imageUrl.includes("abs.twimg.com");

		logger.info(`Is Twitter media URL: ${isTwitterMedia}`);

		// Skip if we've already processed this URL
		if (processedUrls.has(imageUrl)) {
			logger.info(`Skipping duplicate image URL: ${imageUrl}`);
			continue;
		}

		processedUrls.add(imageUrl);

		try {
			logger.info(`Downloading markdown image: ${imageUrl}`);

			// Download the image as a buffer
			const response = await fetch(imageUrl);
			if (!response.ok) {
				logger.error(`Failed to download markdown image: ${response.status} ${response.statusText}`);
				continue;
			}

			const buffer = await response.arrayBuffer();
			const bufferData = Buffer.from(buffer);

			// Create InputMediaPhoto object
			const mediaPhoto: CleanableInputMediaPhoto = {
				type: "photo",
				media: {
					source: bufferData
				},
				_cleanup: () => {
					// Clear buffer reference to help with garbage collection
					bufferData.fill(0);
				}
			};

			images.push(mediaPhoto);
			logger.info(
				`Successfully added markdown image to media array (Twitter media: ${isTwitterMedia}, total images: ${images.length})`
			);
		} catch (error) {
			logger.error(`Error downloading markdown image from ${imageUrl}:`, (error as Error).toString());
		}
	}

	// Remove markdown image patterns from text
	const cleanedText = content.replace(imageMarkdownRegex, "").trim();

	logger.info(`Extracted ${images.length} images from markdown, cleaned text: "${cleanedText}"`);

	return { images, cleanedText };
}

/**
 * Cleans up image data from memory after successful send
 * @param images Array of images to clean up
 */
export function cleanupMarkdownImages(images: CleanableInputMediaPhoto[]): void {
	images.forEach(image => {
		if (image._cleanup) {
			image._cleanup();
		}
	});
}
