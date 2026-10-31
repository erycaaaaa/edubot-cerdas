import { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabaseService';
import { resetStrikes, StrikeAccessError } from '../services/strikeService';

export async function getStudents(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { data: students, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role, school_id, grade, avatar, strike_count, is_blocked, updated_at')
      .eq('school_id', user.schoolId)
      .eq('role', 'student')
      .order('strike_count', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch students', details: error.message });
      return;
    }

    res.json({
      success: true,
      data: students || [],
    });
  } catch (error: any) {
    console.error('Teacher getStudents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { data: notifications, error } = await supabaseAdmin
      .from('teacher_notifications')
      .select('id, violation_id, school_id, student_id, student_name, student_avatar, strike_level, type, title, description, is_read, created_at')
      .eq('school_id', user.schoolId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
      return;
    }

    res.json({
      success: true,
      data: notifications || [],
    });
  } catch (error: any) {
    console.error('Teacher getNotifications error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('teacher_notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('school_id', user.schoolId);

    if (error) {
      res.status(500).json({ error: 'Failed to update notification', details: error.message });
      return;
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('teacher_notifications')
      .update({ is_read: true })
      .eq('school_id', user.schoolId)
      .eq('is_read', false);

    if (error) {
      res.status(500).json({ error: 'Failed to update notifications', details: error.message });
      return;
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function handleResetStudentStrikes(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { studentId } = req.params;
    const { notes } = req.body ?? {};

    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!studentId || (notes != null && (typeof notes !== 'string' || notes.length > 2000))) {
      res.status(400).json({ error: 'Student ID wajib diisi dan catatan maksimal 2000 karakter.' });
      return;
    }

    await resetStrikes({
      studentId,
      teacherId: user.id,
      schoolId: user.schoolId,
      notes,
    });

    res.json({
      success: true,
      message: 'Student strikes reset successfully',
    });
  } catch (error: any) {
    if (error instanceof StrikeAccessError) { res.status(error.status).json({ error: error.message }); return; }
    console.error('Reset strikes error:', error);
    res.status(500).json({ error: 'Failed to reset strikes' });
  }
}
