import logging
from django.conf import settings
from rest_framework.views import exception_handler
from rest_framework.response import Response

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler to mask raw exception details in production.
    """
    response = exception_handler(exc, context)

    if response is not None and response.status_code == 500:
        # If a view returned a 500 response directly, ensure it's also masked
        if not settings.DEBUG and isinstance(response.data, dict) and 'detail' in response.data:
            response.data.pop('detail')

    if response is None:
        # This is an unhandled exception (500 Internal Server Error)
        logger.exception("Unhandled exception in %s", context.get('view'))

        err_payload = {'error': 'Internal server error'}
        # Only expose raw exception details if DEBUG is True
        if settings.DEBUG:
            err_payload['detail'] = str(exc)

        return Response(err_payload, status=500)

    # Standard DRF exceptions (4xx) usually have a 'detail' key
    if isinstance(response.data, dict) and 'detail' in response.data:
        response.data['error'] = str(response.data.pop('detail'))

    return response
