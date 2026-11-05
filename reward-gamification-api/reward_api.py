import os
from typing import Literal, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

PORT = int(os.environ.get("PORT", "8002"))
API_KEY = os.environ.get("REWARD_API_KEY", "").strip()

REWARD_POINTS = {
    "conversation_completed": 1,
    "helpful_feedback": 2,
    "challenge_completed": 20,
    "learning_milestone": 50,
    "safe_interaction": 1,
}

LEVEL_THRESHOLDS = [
    (0, 1, "Learning Explorer"),
    (100, 2, "Curious Learner"),
    (250, 3, "Active Learner"),
    (500, 4, "Problem Solver"),
    (1000, 5, "Learning Champion"),
]

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

def get_level(xp: int) -> dict:
    """Return the current level and progression metadata for a student XP total."""

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

def calculate_reward(
    event: str,
    moderation_label: Optional[str] = None,
    feedback: Optional[str] = None,
) -> dict:
    """Calculate reward points from the event and moderation outcome."""
    label = (moderation_label or "").strip().upper()

    if label == "TOXIC":
        return {
            "reward_delta": 0,
            "reason": "toxic_interaction_no_reward",
            "safety_gate": "BLOCK_REWARD",
        }

    if event == "helpful_feedback":
        points = REWARD_POINTS["helpful_feedback"] if feedback == "helpful" else 0
    else:
        points = REWARD_POINTS.get(event, 0)

    return {
        "reward_delta": points,
        "reason": "rewarded_event" if points > 0 else "no_reward",
        "safety_gate": "PASS",
    }

def evaluate_badges(stats: dict) -> list:
    """Return badges unlocked for the given student stats."""

    unlocked = []

    conversation_count = int(stats.get("conversation_count", 0))
    helpful_feedback_count = int(stats.get("helpful_feedback_count", 0))
    challenge_count = int(stats.get("challenge_count", 0))
    streak_days = int(stats.get("streak_days", 0))

    if conversation_count >= 1:
        unlocked.append("first_conversation")

    if helpful_feedback_count >= 5:
        unlocked.append("feedback_helper")

    if challenge_count >= 1:
        unlocked.append("challenge_solver")

    if streak_days >= 3:
        unlocked.append("learning_streak")

    return [{"badge_id": badge_id, **BADGES[badge_id]} for badge_id in unlocked]

app = FastAPI(
    title="EduBuz Reward & Gamification API",
    description="Stateless reward and gamification service for EduBuz.",
    version="1.1.0",
)

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

class RewardRequest(BaseModel):
    event: EventType
    current_xp: int = Field(default=0, ge=0)
    moderation_label: Optional[ModerationLabel] = None
    feedback: Optional[FeedbackType] = None
    request_id: Optional[str] = None

class BadgeRequest(BaseModel):
    conversation_count: int = Field(default=0, ge=0)
    helpful_feedback_count: int = Field(default=0, ge=0)
    challenge_count: int = Field(default=0, ge=0)
    streak_days: int = Field(default=0, ge=0)

class RewardResponse(BaseModel):
    reward_delta: int
    new_xp: int
    level: dict
    reason: str
    safety_gate: str
    request_id: Optional[str] = None

def verify_key(authorization: Optional[str]) -> None:
    """Require the configured reward API key when one is active."""
    if not API_KEY or authorization == "******":
        return

    if authorization != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

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

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "reward-gamification",
        "stateless": True,
        "port": PORT,
    }

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

    # Validation helpful feedback

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

    # Calculate reward

    result = calculate_reward(
        event=req.event,
        moderation_label=req.moderation_label,
        feedback=req.feedback,
    )

    # Calculate new XP

    new_xp = (
        req.current_xp
        + result["reward_delta"]
    )

    # Calculate level

    level = get_level(new_xp)

    # Response

    return {
        "reward_delta": result["reward_delta"],
        "new_xp": new_xp,
        "level": level,
        "reason": result["reason"],
        "safety_gate": result["safety_gate"],
        "request_id": req.request_id,
    }

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

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "reward_api:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
    )
