import logging
from django.conf import settings
from rest_framework.views import exception_handler
from rest_framework.response import Response

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler that hides sensitive details in production.
    """
    response = exception_handler(exc, context)

    if response is None:
        # This is an unhandled exception (e.g. database error, code bug)
        logger.exception("Unhandled exception in %s", context.get('view'))

        # Only expose raw exception details if DEBUG is True
        error_payload = {'error': 'Internal server error'}
        if settings.DEBUG:
            error_payload['detail'] = str(exc)

        return Response(error_payload, status=500)

    # For DRF exceptions, rename 'detail' to 'error' for frontend consistency
    if isinstance(response.data, dict) and 'detail' in response.data:
        response.data['error'] = str(response.data.pop('detail'))

    return response
