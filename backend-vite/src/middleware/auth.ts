import {
  Request,
  Response,
  NextFunction,
} from 'express';

import { supabaseAdmin } from '../services/supabaseService';

// ============================================================
// AUTH USER TYPE
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'parent' | 'admin';
  schoolId: string;
  schoolName?: string;
  name: string;
  avatar: string;
  grade?: number;
  isBlocked: boolean;
  strikeCount: number;
}

// ============================================================
// EXPRESS TYPE EXTENSION
// ============================================================

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ============================================================
// REQUIRE AUTH
// ============================================================

/**
 * Verify Supabase access token and attach
 * the corresponding profile to req.user.
 *
 * Required:
 * Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  // ----------------------------------------------------------
  // 1. CHECK AUTHORIZATION HEADER
  // ----------------------------------------------------------

  if (!authHeader) {
    console.warn(
      '❌ AUTH 401: Missing authorization header'
    );

    res.status(401).json({
      error: 'Missing authorization header',
    });

    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.warn(
      '❌ AUTH 401: Invalid authorization format'
    );

    res.status(401).json({
      error: 'Invalid authorization header format',
    });

    return;
  }

  // ----------------------------------------------------------
  // 2. EXTRACT ACCESS TOKEN
  // ----------------------------------------------------------

  const token = authHeader
    .slice('Bearer '.length)
    .trim();

  if (!token) {
    console.warn(
      '❌ AUTH 401: Empty authorization token'
    );

    res.status(401).json({
      error: 'Missing authorization token',
    });

    return;
  }

  try {
    // --------------------------------------------------------
    // 3. VERIFY TOKEN WITH SUPABASE
    // --------------------------------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error(
        '❌ AUTH 401: Supabase token verification failed:',
        userError?.message || 'User not found'
      );

      res.status(401).json({
        error: 'Invalid or expired token',
      });

      return;
    }

    // --------------------------------------------------------
    // 4. LOAD PROFILE
    // --------------------------------------------------------

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        email,
        name,
        role,
        school_id,
        grade,
        avatar,
        is_blocked,
        strike_count
      `)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        '❌ AUTH 401: Profile lookup failed:',
        profileError?.message || 'Profile not found',
        '| user_id:',
        user.id
      );

      res.status(401).json({
        error: 'Profile not found. Please register first.',
      });

      return;
    }

    // --------------------------------------------------------
    // 5. VALIDATE ROLE
    // --------------------------------------------------------

    const validRoles = [
      'student',
      'teacher',
      'parent',
      'admin',
    ] as const;

    if (!validRoles.includes(profile.role)) {
      console.error(
        '❌ AUTH 403: Invalid profile role:',
        profile.role
      );

      res.status(403).json({
        error: 'Invalid user role',
      });

      return;
    }

    // --------------------------------------------------------
    // 6. CHECK BLOCKED
    // --------------------------------------------------------

    if (profile.is_blocked === true) {
      console.warn(
        '🚫 AUTH 403: Blocked account:',
        profile.email
      );

      res.status(403).json({
        error: 'Account is blocked',
      });

      return;
    }

    // --------------------------------------------------------
    // 7. ATTACH AUTH USER
    // --------------------------------------------------------

    let schoolName: string | undefined;
    if (profile.role === 'teacher') {
      const { data: school, error } = await supabaseAdmin.from('schools').select('id,name,is_active').eq('id', profile.school_id || '').maybeSingle();
      if (error) { res.status(503).json({ error: 'Status sekolah belum dapat diperiksa.' }); return; }
      if (!school?.is_active) { res.status(403).json({ error: 'Sekolah belum ditentukan atau sedang tidak aktif.' }); return; }
      schoolName = school.name;
    }
    req.user = {
      id: profile.id,
      email: profile.email || user.email || '',
      role: profile.role,
      schoolId: profile.school_id || '',
      schoolName,
      name: profile.name || '',
      avatar: profile.avatar || '🦁',
      grade:
        profile.grade === null ||
        profile.grade === undefined
          ? undefined
          : Number(profile.grade),
      isBlocked: Boolean(profile.is_blocked),
      strikeCount: Number(profile.strike_count || 0),
    };

    // --------------------------------------------------------
    // 8. LOG SUCCESS
    // --------------------------------------------------------

    console.log(
      '✅ Authenticated:',
      {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      }
    );

    next();
  } catch (error) {
    console.error(
      '❌ AUTH 500: Authentication middleware error:',
      error
    );

    res.status(500).json({
      error: 'Authentication failed',
    });
  }
}

// ============================================================
// REQUIRE ROLE
// ============================================================

export function requireRole(
  ...roles: Array<
    'student' |
    'teacher' |
    'parent' |
    'admin'
  >
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
      });

      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error:
          `Access denied. Required role: ${roles.join(' or ')}`,
      });

      return;
    }

    next();
  };
}