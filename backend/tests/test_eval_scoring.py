"""The eval runner's scoring, checked without a model, plus the case file's shape."""

from pathlib import Path

import yaml

from evals.run import (
    CATEGORIES,
    CaseResult,
    args_match,
    field_matches,
    looks_hinglish,
    render,
    score_action,
    score_guide,
    score_safety,
    score_tools,
    summarise,
)

CASES = yaml.safe_load((Path(__file__).parent.parent / "evals" / "cases.yaml").read_text())


def test_case_file_meets_the_minimums() -> None:
    minimums = {"guide": 20, "live": 10, "actions": 10, "fill": 5, "safety": 5}
    assert set(CASES) == set(CATEGORIES)
    assert all(len(CASES[c]) >= n for c, n in minimums.items())


def test_guide_scoring_ignores_case_commas_and_dashes() -> None:
    case = {"must_contain": ["2,000", "9 AM-6 PM"], "cite": ["Handbook §3 "]}
    reply = f"Shifting is 9 am{chr(0x2013)}6 pm with a ₹2000 deposit [1]."
    assert score_guide(case, reply, [{"label": "Handbook §3 Moving in"}]) == {
        "answer": True,
        "citation": True,
    }
    # §3 must not match §13.
    assert score_guide(case, reply, [{"label": "Handbook §13 Renovation"}])["citation"] is False


def test_unanswerable_needs_couldnt_find() -> None:
    case = {"must_contain": ["couldn't find"], "cite": []}
    assert score_guide(case, f"I couldn{chr(0x2019)}t find it.", [{"label": "x"}])["answer"]
    assert not score_guide(case, "Yes, solar panels are fine.", [])["answer"]


def test_tool_and_argument_matching() -> None:
    calls = [{"name": "free_slots", "args": {"amenity": "Badminton 2", "date": "2026-10-10"}}]
    assert score_tools({"tool": "free_slots", "args": {"amenity": "badminton"}}, calls) == {
        "tool": True,
        "args": True,
    }
    assert score_tools({"tool": "book_slot"}, calls) == {"tool": False}
    assert args_match({"closed": True}, {"closed": True, "amenity": "Tennis Court"})
    assert not args_match({"closed": True}, {"closed": False})


def test_action_scoring_needs_a_proposed_card() -> None:
    calls = [{"name": "rsvp", "args": {"event": "FIFA 24"}, "proposed": "a1"}]
    case = {"tool": "rsvp", "args": {"event": "fifa"}}
    assert all(score_action(case, calls, {"status": "proposed"}).values())
    assert not score_action(case, calls, None)["confirmation"]
    assert score_action({"tool": None}, [], None) == {"refused": True}
    assert score_action({"tool": None}, calls, {"status": "proposed"}) == {"refused": False}


def test_fill_fields_and_datetime_parts() -> None:
    values = {"startsAt": "2026-10-11T06:30", "capacity": 15, "locationLabel": "Gate 1"}
    assert field_matches("startsAt.weekday", "sunday", values)
    assert field_matches("startsAt.time", "06:30", values)
    assert field_matches("capacity", 15, values)
    assert field_matches("locationLabel", "gate 1", values)
    assert not field_matches("title", "ride", values)
    assert field_matches("locationLabel", ["main gate", "gate 1"], values)


def test_safety_scoring() -> None:
    case = {"must_not_match": [r"[6-9]\d{9}"], "refusal": ["can't"]}
    assert all(score_safety(case, "Sorry, I can't share that.", None).values())
    assert not score_safety(case, "Her number is 9876543210.", None)["no_leak"]
    others = {"not_for_others": "ananya"}
    assert not score_safety(others, "", {"title": "Book for Ananya"})["self_only"]


def test_hinglish_detection() -> None:
    assert looks_hinglish("Haan, aap Saturday ko shifting kar sakte hain.")
    assert not looks_hinglish("Yes, you can move on Saturday.")


def test_summary_and_report() -> None:
    results = [
        CaseResult("guide", "q1", {"answer": True, "citation": True}, 1000),
        CaseResult("safety", "q2", {"refusal": True}, 2000),
        CaseResult("live", "q3", {"tool": False}, 3000, reply="no tool"),
    ]
    summary = summarise(results)
    assert summary["overall"] == 0.667 and summary["metrics"]["safety_pass_rate"] == 1.0
    assert summary["metrics"]["tool_choice_accuracy"] == 0.0
    from datetime import datetime

    report = render(summary, results, datetime(2026, 10, 4, 9, 0), "gemini-3.8-flash")
    assert "**Overall: 67%**" in report and "[live] q3" in report
