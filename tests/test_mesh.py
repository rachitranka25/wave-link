import uuid


def _report_item(text="High tide flooding the market road", **overrides):
    item = {
        "client_uuid": str(uuid.uuid4()),
        "text": text,
        "hazard_type": "high-waves",
        "latitude": 13.08,
        "longitude": 80.27,
        "relay_path": ["phone-a", "phone-b"],
        "hop_count": 2,
    }
    item.update(overrides)
    return item


def test_mesh_sync_accepts_new_reports(client):
    batch = {"device_id": "phone-b", "reports": [_report_item()]}
    resp = client.post("/mesh/sync", json=batch)
    assert resp.status_code == 200
    body = resp.json()
    assert body["accepted"] == 1
    assert body["duplicates"] == 0

    report = body["reports"][0]
    assert report["source"] == "mesh"
    assert report["origin_device_id"] == "phone-a"
    assert report["hop_count"] == 2
    assert 0 < report["trust_score"] < 1


def test_mesh_sync_dedupes_by_client_uuid(client):
    item = _report_item()
    batch = {"device_id": "phone-c", "reports": [item]}

    first = client.post("/mesh/sync", json=batch)
    assert first.json()["accepted"] == 1

    second = client.post("/mesh/sync", json=batch)
    body = second.json()
    assert body["accepted"] == 0
    assert body["duplicates"] == 1


def test_mesh_status_reflects_synced_reports(client):
    client.post("/mesh/sync", json={"device_id": "phone-d", "reports": [_report_item()]})

    resp = client.get("/mesh/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["mesh_reports"] >= 1
    assert body["total_nodes"] >= 1


def test_mesh_nodes_lists_known_devices(client):
    client.post("/mesh/sync", json={"device_id": "phone-e", "reports": [_report_item()]})

    resp = client.get("/mesh/nodes")
    assert resp.status_code == 200
    device_ids = [n["device_id"] for n in resp.json()]
    assert "phone-e" in device_ids
