"""
Authentication and authorization tests
"""

from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth.hashers import make_password
import uuid

from api.models import User, Role, AuthToken
from api.authentication import CustomTokenAuthentication
from api.permissions import IsManager, IsAuthenticatedCustom, CanAccessEstimate


class CustomTokenAuthenticationTestCase(TestCase):
    """Tests for custom token authentication"""
    
    def setUp(self):
        self.role = Role.objects.create(role_name='менеджер')
        self.user = User.objects.create(
            email='test@example.com',
            full_name='Test User',
            password_hash=make_password('testpass'),
            role=self.role
        )
        self.token = AuthToken.objects.create(user=self.user)
        self.auth = CustomTokenAuthentication()

    def test_valid_token_authentication(self):
        """Test authentication with valid token"""
        from django.http import HttpRequest
        
        request = HttpRequest()
        request.META['HTTP_AUTHORIZATION'] = f'Bearer {self.token.token}'
        
        user, auth_token = self.auth.authenticate(request)
        
        self.assertEqual(user, self.user)
        self.assertIsNone(auth_token)

    def test_invalid_token_authentication(self):
        """Test authentication with invalid token"""
        from django.http import HttpRequest
        from rest_framework.exceptions import AuthenticationFailed
        
        request = HttpRequest()
        request.META['HTTP_AUTHORIZATION'] = f'Bearer {uuid.uuid4()}'
        
        with self.assertRaises(AuthenticationFailed):
            self.auth.authenticate(request)

    def test_malformed_header(self):
        """Test authentication with malformed header"""
        from django.http import HttpRequest
        
        request = HttpRequest()
        request.META['HTTP_AUTHORIZATION'] = 'InvalidHeader'
        
        result = self.auth.authenticate(request)
        self.assertIsNone(result)

    def test_no_authorization_header(self):
        """Test authentication without authorization header"""
        from django.http import HttpRequest
        
        request = HttpRequest()
        
        result = self.auth.authenticate(request)
        self.assertIsNone(result)


class PermissionsTestCase(APITestCase):
    """Tests for custom permissions"""
    
    def setUp(self):
        self.manager_role = Role.objects.create(role_name='менеджер')
        self.foreman_role = Role.objects.create(role_name='прораб')
        
        self.manager = User.objects.create(
            email='manager@test.com',
            full_name='Test Manager',
            password_hash=make_password('testpass'),
            role=self.manager_role
        )
        
        self.foreman = User.objects.create(
            email='foreman@test.com',
            full_name='Test Foreman',
            password_hash=make_password('testpass'),
            role=self.foreman_role
        )

    def test_is_manager_permission(self):
        """Test IsManager permission"""
        permission = IsManager()
        
        # Test with manager
        from django.http import HttpRequest
        manager_request = HttpRequest()
        manager_request.user = self.manager
        
        self.assertTrue(permission.has_permission(manager_request, None))
        
        # Test with foreman
        foreman_request = HttpRequest()
        foreman_request.user = self.foreman
        
        self.assertFalse(permission.has_permission(foreman_request, None))

    def test_is_authenticated_custom_permission(self):
        """Test IsAuthenticatedCustom permission"""
        permission = IsAuthenticatedCustom()
        
        # Test with authenticated user
        from django.http import HttpRequest
        authenticated_request = HttpRequest()
        authenticated_request.user = self.manager
        
        self.assertTrue(permission.has_permission(authenticated_request, None))
        
        # Test with unauthenticated user
        from django.contrib.auth.models import AnonymousUser
        unauthenticated_request = HttpRequest()
        unauthenticated_request.user = AnonymousUser()
        
        self.assertFalse(permission.has_permission(unauthenticated_request, None))


class TokenManagementTestCase(APITestCase):
    """Tests for token management and lifecycle"""
    
    def setUp(self):
        self.role = Role.objects.create(role_name='менеджер')
        self.user = User.objects.create(
            email='test@example.com',
            full_name='Test User',
            password_hash=make_password('testpass'),
            role=self.role
        )

    def test_token_creation_on_login(self):
        """Test that token is created/updated on login"""
        data = {
            'email': 'test@example.com',
            'password': 'testpass'
        }
        response = self.client.post('/api/v1/auth/login/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        
        # Verify token exists in database
        self.assertTrue(AuthToken.objects.filter(user=self.user).exists())

    def test_token_reuse_on_subsequent_login(self):
        """Test that existing token is reused on subsequent logins"""
        # First login
        data = {
            'email': 'test@example.com',
            'password': 'testpass'
        }
        response1 = self.client.post('/api/v1/auth/login/', data)
        token1 = response1.data['token']
        
        # Second login
        response2 = self.client.post('/api/v1/auth/login/', data)
        token2 = response2.data['token']
        
        # Tokens should be the same (update_or_create reuses existing)
        self.assertEqual(token1, token2)
        
        # Only one token should exist in database
        self.assertEqual(AuthToken.objects.filter(user=self.user).count(), 1)

    def test_token_usage_in_api_calls(self):
        """Test using token for authenticated API calls"""
        # Login to get token
        data = {
            'email': 'test@example.com',
            'password': 'testpass'
        }
        response = self.client.post('/api/v1/auth/login/', data)
        token = response.data['token']
        
        # Use token for API call
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/v1/work-categories/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AuthenticationIntegrationTestCase(APITestCase):
    """Integration tests for authentication system"""
    
    def setUp(self):
        self.manager_role = Role.objects.create(role_name='менеджер')
        self.foreman_role = Role.objects.create(role_name='прораб')
        
        self.manager = User.objects.create(
            email='manager@test.com',
            full_name='Test Manager',
            password_hash=make_password('testpass123'),
            role=self.manager_role
        )
        
        self.foreman = User.objects.create(
            email='foreman@test.com',
            full_name='Test Foreman',
            password_hash=make_password('testpass123'),
            role=self.foreman_role
        )

    def test_full_authentication_flow(self):
        """Test complete authentication flow"""
        # 1. Login as manager
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'manager@test.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        manager_token = response.data['token']
        
        # 2. Use token to access manager-only endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {manager_token}')
        response = self.client.get('/api/v1/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Login as foreman
        self.client.credentials()  # Clear credentials
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'foreman@test.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        foreman_token = response.data['token']
        
        # 4. Try to access manager-only endpoint as foreman
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {foreman_token}')
        response = self.client.get('/api/v1/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 5. Access allowed endpoint as foreman
        response = self.client.get('/api/v1/work-categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_concurrent_user_sessions(self):
        """Test that multiple users can have active sessions"""
        # Manager login
        manager_response = self.client.post('/api/v1/auth/login/', {
            'email': 'manager@test.com',
            'password': 'testpass123'
        })
        manager_token = manager_response.data['token']
        
        # Foreman login
        foreman_response = self.client.post('/api/v1/auth/login/', {
            'email': 'foreman@test.com',
            'password': 'testpass123'
        })
        foreman_token = foreman_response.data['token']
        
        # Both tokens should work simultaneously
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {manager_token}')
        response = self.client.get('/api/v1/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {foreman_token}')
        response = self.client.get('/api/v1/work-categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_credentials_handling(self):
        """Test various invalid credential scenarios"""
        # Wrong password
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'manager@test.com',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Non-existent user
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'nonexistent@test.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Missing fields
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'manager@test.com'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Empty fields
        response = self.client.post('/api/v1/auth/login/', {
            'email': '',
            'password': ''
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)