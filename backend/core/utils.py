import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled exception in %s", context.get('view'))
        return Response({'error': 'Internal server error', 'detail': str(exc)}, status=500)
    if isinstance(response.data, dict) and 'detail' in response.data:
        response.data['error'] = str(response.data.pop('detail'))
    return response
