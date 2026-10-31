import { Request, Response } from 'express';

import { supabaseAdmin } from '../services/supabaseService';

import {
  getGamification,
  recordFeedback,
  FeedbackEligibilityError,
} from '../services/gamificationService';

/**
 * GET /api/me/strikes
 *
 * Mengambil status strike student yang sedang login.
 */
export async function getMyStrikes(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'User not authenticated',
      });
      return;
    }

    // Get latest profile state
    const { data: profile, error: profileErr } =
      await supabaseAdmin
        .from('profiles')
        .select('strike_count, is_blocked')
        .eq('id', user.id)
        .single();

    if (profileErr) {
      res.status(500).json({
        error: 'Failed to fetch student profile',
        details: profileErr.message,
      });
      return;
    }

    // Get student violations
    const { data: violations, error: violationsErr } =
      await supabaseAdmin
        .from('violations')
        .select(
          'id, message, detected_words, strike_level, created_at'
        )
        .eq('student_id', user.id)
        .order('created_at', {
          ascending: false,
        })
        .limit(10);

    if (violationsErr) {
      console.error(
        'Failed to fetch violations:',
        violationsErr
      );
    }

    res.json({
      success: true,
      data: {
        strikeCount: profile?.strike_count ?? 0,
        isBlocked: profile?.is_blocked ?? false,
        violations: violations || [],
      },
    });
  } catch (error: any) {
    console.error(
      'Student controller error:',
      error
    );

    res.status(500).json({
      error: 'Failed to get strike status',
      details:
        error?.message || 'Internal server error',
    });
  }
}

/**
 * GET /api/me/gamification
 *
 * Mengambil data XP, level, streak, dan badge
 * milik student yang sedang login.
 */
export async function getMyGamification(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'User not authenticated',
      });
      return;
    }

    const data = await getGamification(user.id);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      'Gamification controller error:',
      error
    );

    res.status(500).json({
      error: 'Failed to fetch gamification data',
      details:
        error?.message || 'Internal server error',
    });
  }
}

/**
 * POST /api/me/gamification/feedback
 *
 * Body:
 * {
 *   "feedback": "helpful",
 *   "requestId": "..."
 * }
 */
export async function submitGamificationFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'User not authenticated',
      });
      return;
    }

    const { feedback, requestId } = req.body ?? {};

    // Validate feedback
    if (
      feedback !== 'helpful' &&
      feedback !== 'not_helpful'
    ) {
      res.status(400).json({
        error:
          'feedback harus helpful atau not_helpful',
      });
      return;
    }

    if (typeof requestId !== 'string' || !requestId.trim() || requestId.length > 200) {
      res.status(400).json({ error: 'requestId percakapan wajib diisi (maksimal 200 karakter).' });
      return;
    }
    const validRequestId = requestId.trim();

    /**
     * recordFeedback menerima SATU object argument.
     *
     * Sebelumnya:
     * recordFeedback(user.id, feedback, validRequestId)
     *
     * Itu menyebabkan:
     * Expected 1 arguments, but got 3.
     */
    const data = await recordFeedback({
      studentId: user.id,
      feedback,
      requestId: validRequestId,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    if (error instanceof FeedbackEligibilityError) {
      res.status(409).json({ error: error.message });
      return;
    }
    console.error(
      'Gamification feedback controller error:',
      error
    );

    res.status(500).json({
      error:
        'Failed to process gamification feedback',
    });
  }
}
