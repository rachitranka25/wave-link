import uuid


def test_create_and_list_message(client):
    resp = client.post(
        "/messages", json={"text": "Road blocked past the bridge", "sender_name": "Asha"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["source"] == "citizen"
    assert body["sender_name"] == "Asha"

    listed = client.get("/messages")
    assert listed.status_code == 200
    texts = [m["text"] for m in listed.json()]
    assert "Road blocked past the bridge" in texts


def _mesh_message_item(**overrides):
    item = {
        "client_uuid": str(uuid.uuid4()),
        "text": "Need drinking water near the relief camp",
        "relay_path": ["phone-x", "phone-y"],
        "hop_count": 2,
    }
    item.update(overrides)
    return item


def test_mesh_message_sync_accepts_new_messages(client):
    batch = {"device_id": "phone-y", "messages": [_mesh_message_item()]}
    resp = client.post("/mesh/messages/sync", json=batch)
    assert resp.status_code == 200
    body = resp.json()
    assert body["accepted"] == 1
    assert body["duplicates"] == 0

    message = body["messages"][0]
    assert message["source"] == "mesh"
    assert message["origin_device_id"] == "phone-x"
    assert 0 < message["trust_score"] < 1


def test_mesh_message_sync_dedupes_by_client_uuid(client):
    item = _mesh_message_item()
    batch = {"device_id": "phone-z", "messages": [item]}

    first = client.post("/mesh/messages/sync", json=batch)
    assert first.json()["accepted"] == 1

    second = client.post("/mesh/messages/sync", json=batch)
    body = second.json()
    assert body["accepted"] == 0
    assert body["duplicates"] == 1
