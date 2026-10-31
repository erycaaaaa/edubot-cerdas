import { Request, Response } from 'express';

import { processChat } from '../services/chatService';

export async function handleChatMessage(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'User not authenticated',
      });
      return;
    }

    const { message, requestId } = req.body ?? {};

    if (
      !message ||
      typeof message !== 'string' ||
      !message.trim()
    ) {
      res.status(400).json({
        error: 'Message cannot be empty',
      });
      return;
    }

    if (message.length > 10000 || (requestId != null &&
        (typeof requestId !== 'string' || !requestId.trim() || requestId.length > 200))) {
      res.status(400).json({ error: 'Pesan maksimal 10000 karakter dan requestId maksimal 200 karakter.' });
      return;
    }

    const validRequestId =
      requestId &&
        typeof requestId === 'string'
        ? requestId
        : `${user.id}-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`;

    const result = await processChat(
      user,
      message.trim(),
      validRequestId,
    );

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    console.error(
      'Chat controller error:',
      error,
    );

    res.status(500).json({
      error: 'Failed to process chat message',
      details:
        error?.message ||
        'Internal server error',
    });
  }
}
