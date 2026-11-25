import unittest

from hh_gui import no_bump


class NoBumpTests(unittest.TestCase):
    def test_skips_own_last_message_and_keeps_discard(self) -> None:
        import hh_applicant_tool.operations.reply_chats as reply

        original = reply.Operation.is_processable
        seen = []

        def fake(self, chat):
            seen.append(chat.applicant_state)
            return True

        reply.Operation.is_processable = fake
        try:
            no_bump.install()
            operation = reply.Operation.__new__(reply.Operation)

            class Chat:
                def __init__(self, mine: bool, state: str) -> None:
                    self.last_is_mine = mine
                    self.applicant_state = state

            mine = Chat(True, "response")
            discard = Chat(True, "DISCARD")
            theirs = Chat(False, "response")
            self.assertFalse(reply.Operation.is_processable(operation, mine))
            self.assertTrue(reply.Operation.is_processable(operation, discard))
            self.assertTrue(reply.Operation.is_processable(operation, theirs))
            self.assertEqual(seen, ["DISCARD", "response"])
        finally:
            reply.Operation.is_processable = original


if __name__ == "__main__":
    unittest.main()
