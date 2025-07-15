import { Embed } from "discord.js";
import { InputMediaPhoto } from "telegraf/types";
import { Logger } from "../Logger";

/**
 * Interface for image data that can be cleaned up
 */
interface CleanableInputMediaPhoto extends InputMediaPhoto {
	_cleanup?: () => void;
}

/**
 * Downloads images from Discord embeds and prepares them for Telegram
 *
 * @param embeds Array of Discord embeds
 * @param logger Logger instance
 * @returns Array of InputMediaPhoto objects for Telegram
 */
export async function downloadEmbedImages(embeds: Embed[], logger: Logger): Promise<CleanableInputMediaPhoto[]> {
	const images: CleanableInputMediaPhoto[] = [];
	const processedUrls = new Set<string>(); // Track processed URLs to avoid duplicates

	logger.info(`Processing ${embeds.length} embeds for image extraction`);

	for (const [index, embed] of embeds.entries()) {
		logger.info(
			`Processing embed ${index}: ${embed.title || "No title"} - Image: ${embed.image?.url || "None"} - Thumbnail: ${embed.thumbnail?.url || "None"} - URL: ${embed.url || "None"} - Type: ${embed.data.type}`
		);

		// Check if this is a Twitter embed with media
		const isTwitterEmbed = embed.url?.includes("twitter.com") || embed.url?.includes("x.com");
		logger.info(`Is Twitter embed: ${isTwitterEmbed}`);

		// Collect all potential image URLs from this embed
		const imageUrls: string[] = [];

		if (embed.image?.url) {
			imageUrls.push(embed.image.url);
		}

		if (embed.thumbnail?.url && embed.thumbnail.url !== embed.image?.url) {
			imageUrls.push(embed.thumbnail.url);
		}

		logger.info(`Found ${imageUrls.length} potential image URLs in embed ${index}`);

		// Process each image URL
		for (const [urlIndex, imageUrl] of imageUrls.entries()) {
			// Skip if we've already processed this URL
			if (processedUrls.has(imageUrl)) {
				logger.info(`Skipping duplicate image URL: ${imageUrl}`);
				continue;
			}

			processedUrls.add(imageUrl);

			try {
				logger.info(`Downloading image ${urlIndex + 1}/${imageUrls.length} from embed ${index}: ${imageUrl}`);

				// Check if this is a Twitter/X media URL
				const isTwitterMedia =
					imageUrl.includes("pbs.twimg.com") ||
					imageUrl.includes("video.twimg.com") ||
					imageUrl.includes("abs.twimg.com");

				logger.info(`Is Twitter media URL: ${isTwitterMedia}`);

				// Download the image as a buffer
				const response = await fetch(imageUrl);
				if (!response.ok) {
					logger.error(`Failed to download image: ${response.status} ${response.statusText}`);
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

				// Add caption only for the first image if embed has title or description
				if (images.length === 0 && (embed.title || embed.description)) {
					let caption = "";
					if (embed.title) {
						caption += `<b>${embed.title}</b>`;
					}
					if (embed.description) {
						if (caption) caption += "\n";
						caption += embed.description.substring(0, 1000); // Limit caption length
					}
					mediaPhoto.caption = caption;
					mediaPhoto.parse_mode = "HTML";
				}

				images.push(mediaPhoto);
				logger.info(
					`Successfully added image to media array (Twitter media: ${isTwitterMedia}, total images: ${images.length})`
				);
			} catch (error) {
				logger.error(`Error downloading image from ${imageUrl}:`, (error as Error).toString());
			}
		}
	}

	logger.info(`Found ${images.length} total images from ${embeds.length} embeds`);
	return images;
}

/**
 * Cleans up image data from memory after successful send
 * @param images Array of images to clean up
 */
export function cleanupImages(images: CleanableInputMediaPhoto[]): void {
	images.forEach(image => {
		if (image._cleanup) {
			image._cleanup();
		}
	});
}
