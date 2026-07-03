import uuid


def test_create_and_get_report(client):
    payload = {
        "text": "Massive flood in progress, people trapped, please evacuate now",
        "hazard_type": "storm-surge",
        "latitude": 19.07,
        "longitude": 72.87,
    }
    resp = client.post("/reports", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["source"] == "citizen"
    assert body["sentiment_label"] == "NEGATIVE"
    assert body["severity_label"] in ("low", "medium", "high")
    assert body["client_uuid"]

    report_id = body["id"]
    fetched = client.get(f"/reports/{report_id}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == report_id


def test_duplicate_client_uuid_rejected(client):
    client_uuid = str(uuid.uuid4())
    payload = {"text": "Calm seas today", "client_uuid": client_uuid}

    first = client.post("/reports", json=payload)
    assert first.status_code == 200

    second = client.post("/reports", json=payload)
    assert second.status_code == 409


def test_list_reports_filters_by_hazard_type(client):
    unique_hazard = f"test-hazard-{uuid.uuid4().hex[:8]}"
    client.post("/reports", json={"text": "high waves observed", "hazard_type": unique_hazard})

    resp = client.get("/reports", params={"hazard_type": unique_hazard})
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["hazard_type"] == unique_hazard


def test_stats_endpoint_shape(client):
    resp = client.get("/reports/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert "total_reports" in body
    assert "by_severity" in body
    assert "by_hazard_type" in body
    assert "by_source" in body


def test_get_missing_report_404s(client):
    resp = client.get("/reports/999999")
    assert resp.status_code == 404


def test_verify_report(client):
    created = client.post("/reports", json={"text": "Storm surge near the pier"})
    report_id = created.json()["id"]
    assert created.json()["verified"] is False

    resp = client.patch(f"/reports/{report_id}/verify")
    assert resp.status_code == 200
    assert resp.json()["verified"] is True

    fetched = client.get(f"/reports/{report_id}")
    assert fetched.json()["verified"] is True


def test_verify_missing_report_404s(client):
    resp = client.patch("/reports/999999/verify")
    assert resp.status_code == 404


def test_list_reports_pagination(client):
    unique_hazard = f"page-test-{uuid.uuid4().hex[:8]}"
    for i in range(3):
        client.post(
            "/reports", json={"text": f"paginated report {i}", "hazard_type": unique_hazard}
        )

    page1 = client.get(
        "/reports", params={"hazard_type": unique_hazard, "limit": 2, "offset": 0}
    ).json()
    page2 = client.get(
        "/reports", params={"hazard_type": unique_hazard, "limit": 2, "offset": 2}
    ).json()

    assert len(page1) == 2
    assert len(page2) == 1
    assert {r["id"] for r in page1}.isdisjoint({r["id"] for r in page2})
