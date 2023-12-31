import {
  connectToSherlockSnowflake,
  consumeStream,
} from "../utils/snowflakeUtils.js";
import { v4 as uuidv4 } from "uuid";

export async function getChatList(userId) {
  try {
    const conn = await connectToSherlockSnowflake();
    const statement = conn.execute({
      sqlText: `
        -- Query to fetch chat list
        SELECT
          c.chatId,
          c.chatName
        FROM
          ChatList AS c
        WHERE
          c.userId = '${userId}';
      `,
    });
    const chatList = [];
    const rows = await consumeStream(statement.streamRows());
    for (const row of rows) {
      const chatId = row["CHATID"];
      const chatName = row["CHATNAME"];
      chatList.push({ chatId, chatName });
    }
    return chatList;
  } catch (err) {
    console.error(
      "Failed to execute statement due to the following error: " + err.message
    );
    throw err;
  }
}

export async function getChatData(userId, chatId) {
  try {
    const conn = await connectToSherlockSnowflake();
    const chatDataStatement = conn.execute({
      sqlText: `
        -- Query to fetch chat data
        SELECT
          text,
          isIn,
          time
        FROM
          ChatData AS cd
        WHERE
          cd.userId = '${userId}'
          AND cd.chatId = '${chatId}';
      `,
    });
    const chatListStatement = conn.execute({
      sqlText: `
        -- Query to fetch chat list
        SELECT
          c.fromDate, 
          c.toDate
        FROM
          ChatList AS c
        WHERE
          c.userId = '${userId}'
          AND c.chatId = '${chatId}';
      `,
    });

    const listRows = await consumeStream(chatListStatement.streamRows());

    if (listRows.length === 0) {
      throw new Error("Chat not found.");
    }

    const list = listRows[0];
    const fromDate = list["FROMDATE"];
    const toDate = list["TODATE"];

    const chatData = [];
    const dataRows = await consumeStream(chatDataStatement.streamRows());
    for (const row of dataRows) {
      const text = row["TEXT"];
      const isIn = row["ISIN"];
      const time = row["TIME"];
      chatData.push({ text, isIn, time });
    }

    console.log("Chat Data:", chatData, fromDate, toDate);

    return {
      dateRange: { fromDate, toDate },
      items: chatData,
    };
  } catch (err) {
    console.error(
      "Failed to execute statement due to the following error: " + err.message
    );
    throw err;
  }
}

export async function createChat(userId, from, to, chatName) {
  try {
    const conn = await connectToSherlockSnowflake();
    const chatId = uuidv4(); // Function to generate a unique UUID
    const statement = await conn.execute({
      sqlText: `
        -- Query to create a chat
        INSERT INTO ChatList (userId, chatId, chatName, fromDate, toDate)
        VALUES (?, ?, ?, ?, ?);
      `,
      binds: [userId, chatId, chatName, from, to],
    });
    await consumeStream(statement.streamRows());

    console.log("Chat created with ID:", chatId);
    return chatId;
  } catch (err) {
    console.error(
      "Failed to execute statement due to the following error: " + err.message
    );
    throw err;
  }
}

export async function pushMessage(userId, chatId, isIn, text) {
  try {
    const conn = await connectToSherlockSnowflake();
    const statement = conn.execute({
      sqlText: `
        -- Query to push a message
        INSERT INTO ChatData (userId, chatId, isIn, text, time)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP);
      `,
      binds: [userId, chatId, isIn, text],
    });
    await consumeStream(statement.streamRows());

    console.log("Message pushed successfully.");
    return true;
  } catch (err) {
    console.error(
      "Failed to execute statement due to the following error: " + err.message
    );
    throw err;
  }
}

export async function updateChatName(userId, chatId, chatName) {
  try {
    const conn = await connectToSherlockSnowflake();

    const statement = conn.execute({
      sqlText: `
        -- Query to update chat name
        UPDATE ChatList
        SET chatName = '${chatName}'
        WHERE userId = '${userId}' AND chatId = '${chatId}';
      `,
    });
    await consumeStream(statement.streamRows());

    console.log("Chat name updated successfully.");
    return true;
  } catch (err) {
    console.error(
      "Failed to execute statement due to the following error: " + err.message
    );
    throw err;
  }
}

export async function deleteChat(userId, chatId) {
  try {
    const conn = await connectToSherlockSnowflake();
    const deleteChatList = conn.execute({
      sqlText: `
        -- Query to delete a chat
        DELETE FROM ChatList
        WHERE userId = '${userId}' AND chatId = '${chatId}';
      `,
    });
    const deleteChatData = conn.execute({
      sqlText: `
        -- Query to delete a chat data
        DELETE FROM ChatData
        WHERE userId = '${userId}' AND chatId = '${chatId}';
      `,
    });
    
    console.log("Chat deleted successfully.");
    return true;
  } catch (err) {
    console.error(
      "Failed to execute statement due to the following error: " + err.message
    );
    throw err;
  }
}

export async function createChatListTable() {
  try {
    const conn = await connectToSherlockSnowflake();
    const statement = conn.execute({
      sqlText: `
        CREATE TABLE IF NOT EXISTS ChatList (
          userId VARCHAR(255),
          chatId VARCHAR(255),
          chatName VARCHAR(255),
          fromDate DATE,
          toDate DATE,
          PRIMARY KEY (userId, chatId)
        );
      `,
    });

    console.log("ChatList table created successfully.");
  } catch (err) {
    console.error(
      "Failed to execute statement due to the following error: " + err.message
    );
    throw err;
  }
}

export async function createChatDataTable() {
  try {
    const conn = await connectToSherlockSnowflake();
    const statement = conn.execute({
      sqlText: `
        CREATE TABLE IF NOT EXISTS ChatData (
          userId VARCHAR(255),
          chatId VARCHAR(255),
          isIn BOOLEAN,
          text TEXT,
          time TIMESTAMP_NTZ,
          PRIMARY KEY (userId, chatId, time)
        );
      `,
    });

    console.log("ChatData table created successfully.");
  } catch (err) {
    console.error(
      "Failed to execute statement due to the following error: " + err.message
    );
    throw err;
  }
}
