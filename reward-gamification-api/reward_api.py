import os
from typing import Optional, Literal

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field


# ============================================================
# CONFIG
# ============================================================

PORT = int(os.environ.get("PORT", "8002"))
API_KEY = os.environ.get("REWARD_API_KEY", "").strip()


# ============================================================
# REWARD CONFIG
# ============================================================

REWARD_POINTS = {
    "conversation_completed": 1,
    "helpful_feedback": 2,
    "challenge_completed": 20,
    "learning_milestone": 50,
    "safe_interaction": 1,
}


# ============================================================
# LEVEL CONFIG
# ============================================================

LEVEL_THRESHOLDS = [
    (0, 1, "Learning Explorer"),
    (100, 2, "Curious Learner"),
    (250, 3, "Active Learner"),
    (500, 4, "Problem Solver"),
    (1000, 5, "Learning Champion"),
]


# ============================================================
# BADGE CONFIG
# ============================================================

BADGES = {
    "first_conversation": {
        "name": "First Step",
        "description": "Completed the first learning conversation.",
        "condition": "conversation_count >= 1",
    },
    "feedback_helper": {
        "name": "Helpful Feedback",
        "description": "Provided helpful feedback on chatbot responses.",
        "condition": "helpful_feedback_count >= 5",
    },
    "challenge_solver": {
        "name": "Challenge Solver",
        "description": "Completed a learning challenge.",
        "condition": "challenge_count >= 1",
    },
    "learning_streak": {
        "name": "Learning Streak",
        "description": "Reached a learning streak.",
        "condition": "streak_days >= 3",
    },
}


# ============================================================
# LEVEL CALCULATION
# ============================================================

def get_level(xp: int) -> dict:
    """
    Menghitung level berdasarkan XP.
    """

    xp = max(0, int(xp))

    current = LEVEL_THRESHOLDS[0]

    for threshold, level, name in LEVEL_THRESHOLDS:
        if xp >= threshold:
            current = (threshold, level, name)
        else:
            break

    threshold, level, name = current

    next_threshold = None

    for threshold_value, _, _ in LEVEL_THRESHOLDS:
        if threshold_value > xp:
            next_threshold = threshold_value
            break

    if next_threshold is None:
        progress = 1.0
    else:
        progress = round(
            (xp - threshold)
            / max(1, next_threshold - threshold),
            4,
        )

    return {
        "level": level,
        "name": name,
        "current_xp": xp,
        "next_level_xp": next_threshold,
        "progress_to_next_level": progress,
    }


# ============================================================
# REWARD CALCULATION
# ============================================================

def calculate_reward(
    event: str,
    moderation_label: Optional[str] = None,
    feedback: Optional[str] = None,
) -> dict:
    """
    Menghitung reward.

    Safety rule:
    TOXIC -> reward 0
    TOXIC -> BLOCK_REWARD

    NON_TOXIC -> reward sesuai event.
    """

    label = (moderation_label or "").strip().upper()

    # --------------------------------------------------------
    # TOXIC = NO REWARD
    # --------------------------------------------------------

    if label == "TOXIC":
        return {
            "reward_delta": 0,
            "reason": "toxic_interaction_no_reward",
            "safety_gate": "BLOCK_REWARD",
        }

    # --------------------------------------------------------
    # NON_TOXIC / NO LABEL
    # --------------------------------------------------------

    if event == "helpful_feedback":
        if feedback == "helpful":
            points = REWARD_POINTS["helpful_feedback"]
        else:
            points = 0
    else:
        points = REWARD_POINTS.get(event, 0)

    return {
        "reward_delta": points,
        "reason": (
            "rewarded_event"
            if points > 0
            else "no_reward"
        ),
        "safety_gate": "PASS",
    }


# ============================================================
# BADGE CALCULATION
# ============================================================

def evaluate_badges(stats: dict) -> list:
    """
    Menghitung badge berdasarkan statistik student.
    """

    unlocked = []

    conversation_count = int(
        stats.get("conversation_count", 0)
    )

    helpful_feedback_count = int(
        stats.get("helpful_feedback_count", 0)
    )

    challenge_count = int(
        stats.get("challenge_count", 0)
    )

    streak_days = int(
        stats.get("streak_days", 0)
    )

    # First conversation
    if conversation_count >= 1:
        unlocked.append("first_conversation")

    # Helpful feedback
    if helpful_feedback_count >= 5:
        unlocked.append("feedback_helper")

    # Challenge
    if challenge_count >= 1:
        unlocked.append("challenge_solver")

    # Learning streak
    if streak_days >= 3:
        unlocked.append("learning_streak")

    return [
        {
            "badge_id": badge_id,
            **BADGES[badge_id],
        }
        for badge_id in unlocked
    ]


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="EduBuz Reward & Gamification API",
    description=(
        "Stateless reward and gamification service "
        "for EduBuz."
    ),
    version="1.1.0",
)


# ============================================================
# TYPES
# ============================================================

EventType = Literal[
    "conversation_completed",
    "helpful_feedback",
    "challenge_completed",
    "learning_milestone",
    "safe_interaction",
]


ModerationLabel = Literal[
    "NON_TOXIC",
    "TOXIC",
]


FeedbackType = Literal[
    "helpful",
    "not_helpful",
]


# ============================================================
# REQUEST MODELS
# ============================================================

class RewardRequest(BaseModel):
    event: EventType

    current_xp: int = Field(
        default=0,
        ge=0,
    )

    moderation_label: Optional[ModerationLabel] = None

    feedback: Optional[FeedbackType] = None

    request_id: Optional[str] = None


class BadgeRequest(BaseModel):
    conversation_count: int = Field(
        default=0,
        ge=0,
    )

    helpful_feedback_count: int = Field(
        default=0,
        ge=0,
    )

    challenge_count: int = Field(
        default=0,
        ge=0,
    )

    streak_days: int = Field(
        default=0,
        ge=0,
    )


class RewardResponse(BaseModel):
    reward_delta: int

    new_xp: int

    level: dict

    reason: str

    safety_gate: str

    request_id: Optional[str] = None


# ============================================================
# AUTH
# ============================================================

def verify_key(
    authorization: Optional[str],
) -> None:
    """
    Kalau REWARD_API_KEY kosong:
        endpoint tidak membutuhkan authentication.

    Kalau REWARD_API_KEY di-set:
        harus menggunakan:

        Authorization: Bearer <REWARD_API_KEY>
    """

    if not API_KEY:
        return

    expected = f"Bearer {API_KEY}"

    if authorization != expected:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
        )


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "service": "EduBuz Reward & Gamification API",
        "status": "ok",
        "version": "1.1.0",
        "port": PORT,
        "endpoints": {
            "health": "GET /health",
            "reward": "POST /reward/evaluate",
            "badges": "POST /reward/badges",
        },
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "reward-gamification",
        "stateless": True,
        "port": PORT,
    }


# ============================================================
# REWARD
# ============================================================

@app.post(
    "/reward/evaluate",
    response_model=RewardResponse,
)
def reward_endpoint(
    req: RewardRequest,
    authorization: Optional[str] = Header(
        default=None
    ),
):
    verify_key(authorization)

    # --------------------------------------------------------
    # Validation helpful feedback
    # --------------------------------------------------------

    if (
        req.event == "helpful_feedback"
        and req.feedback is None
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "feedback is required "
                "for helpful_feedback event"
            ),
        )

    # --------------------------------------------------------
    # Calculate reward
    # --------------------------------------------------------

    result = calculate_reward(
        event=req.event,
        moderation_label=req.moderation_label,
        feedback=req.feedback,
    )

    # --------------------------------------------------------
    # Calculate new XP
    # --------------------------------------------------------

    new_xp = (
        req.current_xp
        + result["reward_delta"]
    )

    # --------------------------------------------------------
    # Calculate level
    # --------------------------------------------------------

    level = get_level(new_xp)

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return {
        "reward_delta": result["reward_delta"],
        "new_xp": new_xp,
        "level": level,
        "reason": result["reason"],
        "safety_gate": result["safety_gate"],
        "request_id": req.request_id,
    }


# ============================================================
# BADGES
# ============================================================

@app.post("/reward/badges")
def badges_endpoint(
    req: BadgeRequest,
    authorization: Optional[str] = Header(
        default=None
    ),
):
    verify_key(authorization)

    stats = {
        "conversation_count": req.conversation_count,
        "helpful_feedback_count": (
            req.helpful_feedback_count
        ),
        "challenge_count": req.challenge_count,
        "streak_days": req.streak_days,
    }

    badges = evaluate_badges(stats)

    return {
        "badges": badges,
        "count": len(badges),
    }


# ============================================================
# LOCAL START
# ============================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "reward_api:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
    )
