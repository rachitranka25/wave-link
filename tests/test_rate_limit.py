from app.middleware import rate_limit as rl


def test_rate_limit_returns_429_over_threshold(client, monkeypatch):
    monkeypatch.setattr(rl, "MAX_REQUESTS", 3)
    rl._hits.clear()

    for _ in range(3):
        resp = client.post("/reports", json={"text": "rate limit filler report"})
        assert resp.status_code == 200

    limited = client.post("/reports", json={"text": "this one should be blocked"})
    assert limited.status_code == 429
    assert "rate limit" in limited.json()["detail"].lower()


def test_rate_limit_does_not_apply_to_get(client, monkeypatch):
    monkeypatch.setattr(rl, "MAX_REQUESTS", 1)
    rl._hits.clear()

    client.post("/reports", json={"text": "uses up the one write slot"})

    for _ in range(5):
        resp = client.get("/reports")
        assert resp.status_code == 200
