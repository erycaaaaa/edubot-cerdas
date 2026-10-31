"""Pure reward rules; no HTTP service or database required."""
import unittest
from fastapi import HTTPException
from reward_api import RewardRequest, reward_endpoint, get_level, calculate_reward, evaluate_badges


class RewardRulesTest(unittest.TestCase):
    def test_current_points_and_toxic_gate(self):
        for event, points in [('conversation_completed', 1), ('helpful_feedback', 2),
                              ('challenge_completed', 20), ('learning_milestone', 50), ('safe_interaction', 1)]:
            self.assertEqual(calculate_reward(event, 'NON_TOXIC', 'helpful')['reward_delta'], points)
            toxic = calculate_reward(event, 'TOXIC', 'helpful')
            self.assertEqual(toxic['reward_delta'], 0)
            self.assertEqual(toxic['safety_gate'], 'BLOCK_REWARD')
        self.assertEqual(calculate_reward('helpful_feedback', 'NON_TOXIC', 'not_helpful')['reward_delta'], 0)

    def test_level_boundaries_and_fraction(self):
        for xp, level in [(0, 1), (99, 1), (100, 2), (249, 2), (250, 3), (499, 3), (500, 4), (999, 4), (1000, 5)]:
            self.assertEqual(get_level(xp)['level'], level)
        self.assertEqual(get_level(50)['progress_to_next_level'], 0.5)
        self.assertIsNone(get_level(1000)['next_level_xp'])
        self.assertEqual(get_level(1000)['progress_to_next_level'], 1)

    def test_badge_thresholds(self):
        self.assertEqual(evaluate_badges({}), [])
        badges = evaluate_badges(dict(conversation_count=1, helpful_feedback_count=5, challenge_count=1, streak_days=3))
        self.assertEqual(len(badges), 4)

    def test_invalid_feedback_and_negative_xp(self):
        from unittest.mock import patch
        with patch('reward_api.API_KEY', ''):
            with self.assertRaises(HTTPException) as error:
                reward_endpoint(RewardRequest(event='helpful_feedback'), None)
            self.assertEqual(error.exception.status_code, 422)
        with self.assertRaises(ValueError):
            RewardRequest(event='conversation_completed', current_xp=-1)

    def test_optional_bearer_key(self):
        from unittest.mock import patch
        from reward_api import verify_key
        with patch('reward_api.API_KEY', 'local-test-key'):
            with self.assertRaises(HTTPException) as error:
                verify_key(None)
            self.assertEqual(error.exception.status_code, 401)
            verify_key('Bearer local-test-key')


if __name__ == '__main__':
    unittest.main()
