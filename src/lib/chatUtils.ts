import { Message } from "ai/react";

// Define the Chats interface
export interface Chats {
  [key: string]: { chatId: string; messages: Message[] }[];
}

// Helper function to group chats by date
export const groupChatsByDate = (
  chatsToGroup: { chatId: string; messages: Message[] }[]
): Chats => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groupedChats: Chats = {};

  chatsToGroup.forEach((chat) => {
    // Add null/undefined check for createdAt
    const createdAt = chat.messages[0]?.createdAt
      ? new Date(chat.messages[0].createdAt)
      : new Date(0);
    // Handle cases where createdAt might be invalid
    if (isNaN(createdAt.getTime())) {
      console.warn(`Invalid date for chat ${chat.chatId}, skipping grouping.`);
      return;
    }

    // Calculate difference in days relative to the start of the day
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const createdAtStart = new Date(createdAt.setHours(0, 0, 0, 0));

    const diffInTime = todayStart.getTime() - createdAtStart.getTime();
    const diffInDays = Math.floor(diffInTime / (1000 * 3600 * 24));

    let group: string;
    if (diffInDays === 0) {
      group = "今天";
    } else if (diffInDays === 1) {
      group = "昨天";
    } else if (diffInDays <= 7) {
      group = "过去 7 天";
    } else if (diffInDays <= 30) {
      group = "过去 30 天";
    } else {
      group = "更早";
    }

    if (!groupedChats[group]) {
      groupedChats[group] = [];
    }
    groupedChats[group].push(chat);
  });

  return groupedChats;
};

// Function to get and group chats from localStorage
export const getLocalstorageChats = (): Chats => {
  // Check if localStorage is available (for server-side rendering or environments where it's not)
  if (typeof localStorage === "undefined") {
    return {};
  }

  const chatKeys = Object.keys(localStorage).filter((key) =>
    key.startsWith("chat_")
  );

  if (chatKeys.length === 0) {
    return {}; // Return empty object if no chats
  }

  // Map through the chats and return an object with chatId and messages
  const chatObjects = chatKeys
    .map((chatKey) => {
      const item = localStorage.getItem(chatKey);
      try {
        // Use chatKey directly as chatId, assuming format "chat_..."
        const messages = item ? JSON.parse(item) : [];
        // Basic validation for messages array and first message's createdAt
        if (
          Array.isArray(messages) &&
          messages.length > 0 &&
          messages[0]?.createdAt
        ) {
          return { chatId: chatKey, messages: messages as Message[] };
        }
      } catch (error) {
        console.error(`Error parsing localStorage item ${chatKey}:`, error);
      }
      return null; // Return null for invalid/empty chats
    })
    .filter(
      (chat): chat is { chatId: string; messages: Message[] } => chat !== null
    ); // Filter out nulls and type guard

  // Sort chats by the createdAt date of the first message of each chat
  chatObjects.sort((a, b) => {
    // Dates are validated in the map step, but add fallback just in case
    const aDate = new Date(a.messages[0]?.createdAt ?? 0);
    const bDate = new Date(b.messages[0]?.createdAt ?? 0);
    return bDate.getTime() - aDate.getTime();
  });

  // Group the valid, sorted chats
  const groupedChats = groupChatsByDate(chatObjects);

  return groupedChats;
};
