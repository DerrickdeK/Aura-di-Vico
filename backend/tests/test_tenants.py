"""Unit tests for the tenant resolver."""
import os

import pytest


@pytest.fixture
def fake_request():
    class _Headers(dict):
        def get(self, k, default=""):
            return dict.get(self, k.lower(), default)

    class _QueryParams(dict):
        def get(self, k, default=None):
            return dict.get(self, k, default)

    class _R:
        def __init__(self, headers=None, query=None):
            self.headers = _Headers({(k.lower()): v for k, v in (headers or {}).items()})
            self.query_params = _QueryParams(query or {})
    return _R


class TestAvailableTenants:
    def test_lists_brera_and_vico(self):
        from tenants import available_tenants
        slugs = set(available_tenants())
        assert "brera-milano" in slugs
        assert "vico-equense" in slugs


class TestResolveTenant:
    def test_header_wins(self, fake_request):
        from tenants import resolve_tenant
        r = fake_request(headers={"X-Tenant-Slug": "brera-milano"})
        assert resolve_tenant(r) == "brera-milano"

    def test_query_param(self, fake_request):
        from tenants import resolve_tenant
        r = fake_request(query={"tenant": "brera-milano"})
        assert resolve_tenant(r) == "brera-milano"

    def test_subdomain(self, fake_request):
        from tenants import resolve_tenant
        r = fake_request(headers={"host": "brera-milano.aura.app"})
        assert resolve_tenant(r) == "brera-milano"

    def test_unknown_falls_back_to_default(self, fake_request):
        from tenants import resolve_tenant
        r = fake_request(query={"tenant": "atlantis"})
        slug = resolve_tenant(r)
        # Default is whatever AREA_CONFIG_PATH points at — must exist in the list
        from tenants import available_tenants
        assert slug in available_tenants()

    def test_www_is_not_a_tenant(self, fake_request):
        from tenants import resolve_tenant
        r = fake_request(headers={"host": "www.example.com"})
        # Falls through to default
        from tenants import available_tenants
        assert resolve_tenant(r) in available_tenants()

    def test_localhost_is_not_a_tenant(self, fake_request):
        from tenants import resolve_tenant, available_tenants
        r = fake_request(headers={"host": "localhost:8001"})
        assert resolve_tenant(r) in available_tenants()


class TestDefaultTenant:
    def test_explicit_env_wins(self, monkeypatch):
        monkeypatch.setenv("DEFAULT_TENANT_SLUG", "brera-milano")
        from tenants import default_tenant
        assert default_tenant() == "brera-milano"
        monkeypatch.delenv("DEFAULT_TENANT_SLUG")
