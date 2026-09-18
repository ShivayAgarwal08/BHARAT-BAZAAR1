import os
import tempfile
import unittest
from pathlib import Path

# Configure an isolated database before importing the application.
_temp_dir = tempfile.TemporaryDirectory()
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_temp_dir.name) / 'product-flow.db'}"
os.environ["JWT_SECRET"] = "phase5a-isolated-test-secret-with-at-least-32-bytes"
os.environ["ADMIN_EMAIL"] = ""
os.environ["ADMIN_PASSWORD"] = ""

from fastapi.testclient import TestClient

from database import engine
from main import app


class ProductFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        engine.dispose()
        _temp_dir.cleanup()

    def test_artisan_can_create_and_read_reviewed_ai_draft(self):
        signup = self.client.post(
            "/auth/signup",
            json={
                "name": "Phase Five Artisan",
                "email": "phase5-artisan@example.test",
                "password": "SafeTestPass123!",
                "role": "artisan",
                "language": "en",
            },
        )
        self.assertEqual(signup.status_code, 200)
        headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

        created = self.client.post(
            "/product/create",
            headers=headers,
            json={
                "raw_description": "I have 20 handmade clay diyas.",
                "quantity": 20,
                "language": "en",
                "ai_data": {
                    "source": "ai",
                    "title": "Handmade Clay Diyas",
                    "description": "20 handmade clay diyas.",
                    "category": "pottery",
                    "material": "clay",
                    "materials": ["clay"],
                    "quantity": 20,
                    "tags": ["clay", "diyas"],
                    "suggested_price": 250,
                    "suggested_price_min": 200,
                    "suggested_price_max": 300,
                    "profit_margin": None,
                },
            },
        )
        self.assertEqual(created.status_code, 200)
        self.assertEqual(created.json()["price"], 250)
        self.assertIsNone(created.json()["profit_margin"])

        listed = self.client.get("/product/list", headers=headers)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()), 1)
        self.assertEqual(listed.json()[0]["title"], "Handmade Clay Diyas")
        self.assertEqual(listed.json()[0]["quantity"], 20)


if __name__ == "__main__":
    unittest.main()
