/**
 * Minimal Telegram Bot API client built on `fetch` (no SDK, no `request`
 * dependency). Works identically in:
 *   - the Vercel serverless webhook route (app/api/telegram/webhook)
 *   - the local long-poll dev bot (bot/bot.ts via tsx)
 */

export interface TgInlineButton {
  text: string;
  callback_data: string;
}
export interface TgInlineKeyboard {
  inline_keyboard: TgInlineButton[][];
}

export interface TgChat {
  id: number;
  first_name?: string;
  username?: string;
}
export interface TgPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
}
export interface TgMessage {
  message_id: number;
  chat: TgChat;
  from?: { id: number; first_name?: string; username?: string };
  text?: string;
  photo?: TgPhotoSize[];
}
export interface TgCallbackQuery {
  id: string;
  data?: string;
  message?: TgMessage;
  from: { id: number; first_name?: string };
}
export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

export class TelegramClient {
  private base: string;
  private fileBase: string;

  constructor(private token: string) {
    this.base = `https://api.telegram.org/bot${token}`;
    this.fileBase = `https://api.telegram.org/file/bot${token}`;
  }

  private async call<T = unknown>(
    method: string,
    body: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(`${this.base}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!json.ok) {
      throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
    }
    return json.result as T;
  }

  async sendMessage(
    chatId: number,
    text: string,
    opts?: { parseMode?: "Markdown" | "MarkdownV2"; replyMarkup?: TgInlineKeyboard }
  ): Promise<TgMessage> {
    return this.call<TgMessage>("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: opts?.parseMode,
      reply_markup: opts?.replyMarkup,
      disable_web_page_preview: true,
    });
  }

  async editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    opts?: { parseMode?: "Markdown" | "MarkdownV2" }
  ): Promise<void> {
    try {
      await this.call("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: opts?.parseMode,
        disable_web_page_preview: true,
      });
    } catch {
      // Edit can fail if content is identical or message too old — non-fatal.
    }
  }

  async answerCallbackQuery(id: string): Promise<void> {
    try {
      await this.call("answerCallbackQuery", { callback_query_id: id });
    } catch {
      /* non-fatal */
    }
  }

  /** Download a Telegram file by id and return base64 + mime. */
  async getFileBase64(
    fileId: string
  ): Promise<{ base64: string; mimeType: string }> {
    const file = await this.call<{ file_path: string }>("getFile", {
      file_id: fileId,
    });
    const res = await fetch(`${this.fileBase}/${file.file_path}`);
    if (!res.ok) throw new Error(`File download failed ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // Prefer the server-reported content type; fall back to extension sniffing.
    const headerType = res.headers.get("content-type");
    const mimeType =
      headerType && headerType.startsWith("image/")
        ? headerType
        : file.file_path.endsWith(".png")
          ? "image/png"
          : "image/jpeg";
    return { base64: buf.toString("base64"), mimeType };
  }

  // ── Polling + webhook management (used by bot.ts / setup script) ───────────
  async getUpdates(offset: number, timeout = 25): Promise<TgUpdate[]> {
    const res = await fetch(
      `${this.base}/getUpdates?offset=${offset}&timeout=${timeout}`,
      { method: "GET" }
    );
    const json = (await res.json()) as { ok: boolean; result?: TgUpdate[] };
    return json.ok ? json.result ?? [] : [];
  }

  async setWebhook(url: string, secretToken?: string): Promise<void> {
    await this.call("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"],
    });
  }

  async deleteWebhook(): Promise<void> {
    await this.call("deleteWebhook", { drop_pending_updates: false });
  }
}
