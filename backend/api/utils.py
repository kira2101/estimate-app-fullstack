"""
Utility functions for the API
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that logs errors and provides consistent error responses
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Log the error
        request = context.get('request', None)
        if request:
            user = getattr(request, 'user', None)
            user_info = user.email if hasattr(user, 'email') else 'AnonymousUser'
            
            logger.error(
                f"API Error: {exc} | User: {user_info} | "
                f"Path: {request.path} | Method: {request.method}"
            )

        # Customize error response format
        custom_response_data = {
            'error': True,
            'message': 'An error occurred',
            'details': response.data if response.data else str(exc)
        }
        
        # Add specific error messages for common cases
        if response.status_code == 400:
            custom_response_data['message'] = 'Validation error'
        elif response.status_code == 401:
            custom_response_data['message'] = 'Authentication required'
        elif response.status_code == 403:
            custom_response_data['message'] = 'Permission denied'
        elif response.status_code == 404:
            custom_response_data['message'] = 'Resource not found'
        elif response.status_code == 500:
            custom_response_data['message'] = 'Internal server error'

        response.data = custom_response_data

    return response


def validate_file_upload(file, allowed_types=None, max_size_mb=5):
    """
    Validate uploaded files
    """
    if allowed_types is None:
        allowed_types = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    
    # Check file type
    if file.content_type not in allowed_types:
        return False, f"File type {file.content_type} not allowed"
    
    # Check file size
    max_size = max_size_mb * 1024 * 1024  # Convert MB to bytes
    if file.size > max_size:
        return False, f"File size {file.size} exceeds maximum {max_size_mb}MB"
    
    return True, "File is valid"


def sanitize_filename(filename):
    """
    Sanitize filename to prevent path traversal attacks
    """
    import os
    import re
    
    # Remove path components
    filename = os.path.basename(filename)
    
    # Remove dangerous characters
    filename = re.sub(r'[^\w\s.-]', '', filename)
    
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255-len(ext)] + ext
    
    return filename


def generate_secure_token():
    """
    Generate a cryptographically secure token
    """
    import secrets
    return secrets.token_urlsafe(32)


def mask_sensitive_data(data, fields_to_mask=None):
    """
    Mask sensitive data in logs
    """
    if fields_to_mask is None:
        fields_to_mask = ['password', 'token', 'secret', 'key']
    
    if isinstance(data, dict):
        masked_data = {}
        for key, value in data.items():
            if any(field in key.lower() for field in fields_to_mask):
                masked_data[key] = '*' * 8
            else:
                masked_data[key] = mask_sensitive_data(value, fields_to_mask)
        return masked_data
    elif isinstance(data, list):
        return [mask_sensitive_data(item, fields_to_mask) for item in data]
    else:
        return data


def calculate_file_hash(file):
    """
    Calculate SHA-256 hash of uploaded file
    """
    import hashlib
    
    hash_sha256 = hashlib.sha256()
    for chunk in file.chunks():
        hash_sha256.update(chunk)
    
    return hash_sha256.hexdigest()


def is_safe_redirect_url(url, allowed_hosts):
    """
    Check if redirect URL is safe
    """
    from urllib.parse import urlparse
    
    if not url:
        return False
    
    parsed_url = urlparse(url)
    
    # Allow relative URLs
    if not parsed_url.netloc:
        return True
    
    # Check if host is in allowed hosts
    return parsed_url.netloc in allowed_hosts